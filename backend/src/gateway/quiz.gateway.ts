import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionService } from '../session/session.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class QuizGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private timers = new Map<string, NodeJS.Timeout>();
  private timerRemaining = new Map<string, number>();
  private pausedAt = new Map<string, number>();

  private readonly DISCONNECT_GRACE_MS = 10000;

  constructor(
    private sessionService: SessionService,
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async handleDisconnect(client: Socket) {
    // Give the client a grace period to reconnect (e.g. brief network drop,
    // mobile tab backgrounding) before treating them as having left. If they
    // reconnect via 'rejoin-room' in the meantime, their socketId in the DB
    // will have already moved on, so this lookup will simply find nothing.
    const socketId = client.id;
    setTimeout(async () => {
      const participant = await this.sessionService.removeParticipant(socketId);
      if (participant) {
        const count = await this.prisma.participant.count({
          where: { sessionId: participant.sessionId, socketId: { not: null } },
        });
        this.server.to(participant.sessionId).emit('player-left', {
          participantId: participant.id,
          playerName: participant.name,
          totalPlayers: count,
        });
      }
    }, this.DISCONNECT_GRACE_MS);
  }

  @SubscribeMessage('join-room')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { pin: string; playerName: string; teamName?: string },
  ) {
    try {
      if (client.data?.participantId) {
        client.emit('error', { message: 'Already joined' });
        return;
      }

      const session = await this.sessionService.findByPin(data.pin);
      if (session.status === 'FINISHED') {
        client.emit('error', { message: 'This quiz has already ended' });
        return;
      }

      const existing = await this.prisma.participant.findFirst({
        where: { sessionId: session.id, socketId: client.id },
      });
      if (existing) {
        client.emit('joined', {
          participant: existing,
          sessionId: session.id,
          quizTitle: session.quiz.title,
        });
        return;
      }

      const participant = await this.sessionService.addParticipant(
        session.id,
        data.playerName,
        client.id,
        data.teamName,
      );

      client.join(session.id);
      client.data = { sessionId: session.id, participantId: participant.id };

      const count = await this.prisma.participant.count({
        where: { sessionId: session.id },
      });

      client.emit('joined', {
        participant,
        sessionId: session.id,
        quizTitle: session.quiz.title,
      });

      this.server.to(session.id).emit('player-joined', {
        participant,
        totalPlayers: count,
      });
    } catch (err: any) {
      client.emit('error', { message: err.message || 'Failed to join' });
    }
  }

  @SubscribeMessage('rejoin-room')
  async handleRejoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; participantId: string },
  ) {
    try {
      const participant = await this.sessionService.rejoinParticipant(
        data.participantId,
        data.sessionId,
        client.id,
      );
      if (!participant) {
        client.emit('rejoin-failed');
        return;
      }

      client.join(data.sessionId);
      client.data = { sessionId: data.sessionId, participantId: participant.id };

      client.emit('rejoin-success', {
        participant,
        score: participant.score,
      });

      // Restore whatever is actually happening in the session right now —
      // without this, a reconnecting/refreshing participant always lands on
      // "waiting for host" even if a question is live, silently locking them
      // out of answering until the next question starts.
      const sync = await this.buildSessionSync(data.sessionId, participant.id);
      if (sync) client.emit('session-sync', sync);
    } catch (err: any) {
      client.emit('rejoin-failed');
    }
  }

  private async buildSessionSync(sessionId: string, participantId: string) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } },
    });
    if (!session) return null;

    if (session.status === 'FINISHED') {
      const results = await this.sessionService.getResults(sessionId);
      return { status: 'FINISHED' as const, results };
    }

    const questionCache = this.cache.get<any>(`question:${sessionId}`);
    if (session.status === 'LOBBY' || !questionCache) {
      return { status: 'LOBBY' as const };
    }

    const question = await this.prisma.question.findUnique({
      where: { id: questionCache.questionId },
    });
    if (!question) return { status: 'LOBBY' as const };

    const elapsed = (Date.now() - questionCache.startTime) / 1000;
    const remaining =
      questionCache.timeLimit > 0
        ? Math.max(0, Math.ceil(questionCache.timeLimit - elapsed))
        : 0;

    if (questionCache.timeLimit > 0 && remaining <= 0) {
      // The question is effectively over but hasn't been cleaned up yet —
      // don't hand the client a dead question, just show "waiting".
      return { status: 'LOBBY' as const };
    }

    const isText = question.questionType === 'text';
    const options = isText ? [] : JSON.parse(question.options);
    const isSurvey = question.correctOption === -1;

    const existingResponse = await this.prisma.response.findFirst({
      where: { sessionId, participantId, questionId: question.id },
    });

    return {
      status: session.status as 'ACTIVE' | 'PAUSED',
      paused: session.status === 'PAUSED',
      question: {
        questionId: question.id,
        questionNumber: session.currentQuestion + 1,
        totalQuestions: session.quiz.questions.length,
        text: question.text,
        imageUrl: question.imageUrl,
        questionType: question.questionType || 'mcq',
        options: isText ? [] : questionCache.optionOrder.map((i: number) => options[i]),
        optionOrder: isText ? [] : questionCache.optionOrder,
        timeLimit: questionCache.timeLimit,
        isSurvey: isText ? true : isSurvey,
        scoringMode: questionCache.scoringMode,
      },
      remaining,
      alreadyAnswered: !!existingResponse,
      myResponse: existingResponse
        ? { isCorrect: existingResponse.isCorrect, score: existingResponse.score, isSurvey }
        : undefined,
    };
  }

  @SubscribeMessage('host-join')
  async handleHostJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.join(data.sessionId);
    client.data = { sessionId: data.sessionId, isHost: true };

    const count = await this.prisma.participant.count({
      where: { sessionId: data.sessionId },
    });
    client.emit('host-joined', { totalPlayers: count });
  }

  @SubscribeMessage('start-question')
  async handleStartQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id: data.sessionId },
      include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } },
    });
    if (!session) return;

    const nextIndex = session.currentQuestion + 1;
    const questions = session.quiz.questions;

    if (nextIndex >= questions.length) {
      await this.sessionService.updateStatus(data.sessionId, 'FINISHED');
      const results = await this.sessionService.getResults(data.sessionId);
      this.server.to(data.sessionId).emit('quiz-finished', results);
      return;
    }

    await this.sessionService.updateStatus(data.sessionId, 'ACTIVE');
    await this.sessionService.updateCurrentQuestion(data.sessionId, nextIndex);

    const question = questions[nextIndex];
    const isText = question.questionType === 'text';
    const options = isText ? [] : JSON.parse(question.options);
    const isSurvey = question.correctOption === -1;

    const settings = JSON.parse(session.quiz.settings || '{}');
    const scoringMode = settings.scoringMode || 'time';
    let optionOrder = [0, 1, 2, 3];
    if (!isText && settings.randomizeOptions) {
      optionOrder = optionOrder.sort(() => Math.random() - 0.5);
    }

    this.server.to(data.sessionId).emit('question-start', {
      questionId: question.id,
      questionNumber: nextIndex + 1,
      totalQuestions: questions.length,
      text: question.text,
      imageUrl: question.imageUrl,
      questionType: question.questionType || 'mcq',
      options: isText ? [] : optionOrder.map((i) => options[i]),
      optionOrder: isText ? [] : optionOrder,
      timeLimit: question.timeLimit,
      isSurvey: isText ? true : isSurvey,
      scoringMode,
    });

    this.cache.set(`question:${data.sessionId}`, {
      questionId: question.id,
      questionType: question.questionType || 'mcq',
      startTime: Date.now(),
      timeLimit: question.timeLimit,
      optionOrder: isText ? [] : optionOrder,
      scoringMode,
    });

    if (question.timeLimit > 0) {
      this.startTimer(data.sessionId, question.id, question.timeLimit);
    }
  }

  private startTimer(sessionId: string, questionId: string, seconds: number) {
    const existing = this.timers.get(sessionId);
    if (existing) clearInterval(existing);

    let remaining = seconds;
    this.timerRemaining.set(sessionId, remaining);

    const timer = setInterval(() => {
      remaining--;
      this.timerRemaining.set(sessionId, remaining);
      this.server.to(sessionId).emit('timer-update', { remaining });
      if (remaining <= 0) {
        clearInterval(timer);
        this.timers.delete(sessionId);
        this.timerRemaining.delete(sessionId);
        this.endQuestion(sessionId, questionId);
      }
    }, 1000);

    this.timers.set(sessionId, timer);
  }

  @SubscribeMessage('end-question-manual')
  async handleEndQuestionManual(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const questionCache = this.cache.get<any>(`question:${data.sessionId}`);
    if (!questionCache) return;

    const timer = this.timers.get(data.sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(data.sessionId);
    }
    this.timerRemaining.delete(data.sessionId);
    this.pausedAt.delete(data.sessionId);

    this.endQuestion(data.sessionId, questionCache.questionId);
  }

  @SubscribeMessage('submit-answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { sessionId: string; questionId: string; answer: number },
  ) {
    try {
      const questionCache = this.cache.get<any>(`question:${data.sessionId}`);
      if (!questionCache || questionCache.questionId !== data.questionId) {
        client.emit('error', { message: 'Question not active' });
        return;
      }

      const responseTime =
        (Date.now() - questionCache.startTime) / 1000;

      const originalAnswer = questionCache.optionOrder[data.answer];
      const scoringMode = questionCache.scoringMode || 'time';

      const response = await this.sessionService.submitResponse(
        data.sessionId,
        client.data.participantId,
        data.questionId,
        originalAnswer,
        responseTime,
        scoringMode,
      );

      client.emit('answer-confirmed', {
        isCorrect: response.isCorrect,
        score: response.score,
        isSurvey: response.isSurvey,
      });

      const responseCount = await this.prisma.response.count({
        where: { sessionId: data.sessionId, questionId: data.questionId },
      });
      const totalPlayers = await this.prisma.participant.count({
        where: { sessionId: data.sessionId },
      });

      this.server.to(data.sessionId).emit('answer-received', {
        responseCount,
        totalPlayers,
      });
    } catch (err: any) {
      client.emit('error', { message: err.message || 'Failed to submit' });
    }
  }

  @SubscribeMessage('submit-text-answer')
  async handleSubmitTextAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { sessionId: string; questionId: string; textAnswer: string },
  ) {
    try {
      const questionCache = this.cache.get<any>(`question:${data.sessionId}`);
      if (!questionCache || questionCache.questionId !== data.questionId) {
        client.emit('error', { message: 'Question not active' });
        return;
      }

      const responseTime = (Date.now() - questionCache.startTime) / 1000;

      await this.sessionService.submitTextResponse(
        data.sessionId,
        client.data.participantId,
        data.questionId,
        data.textAnswer,
        responseTime,
      );

      client.emit('answer-confirmed', {
        isCorrect: false,
        score: 0,
        isSurvey: true,
        isText: true,
      });

      const responseCount = await this.prisma.response.count({
        where: { sessionId: data.sessionId, questionId: data.questionId },
      });
      const totalPlayers = await this.prisma.participant.count({
        where: { sessionId: data.sessionId },
      });

      this.server.to(data.sessionId).emit('answer-received', {
        responseCount,
        totalPlayers,
      });

      const wordCloud = await this.sessionService.getWordCloudData(
        data.sessionId,
        data.questionId,
      );
      this.server.to(data.sessionId).emit('word-cloud-update', {
        questionId: data.questionId,
        ...wordCloud,
      });
    } catch (err: any) {
      client.emit('error', { message: err.message || 'Failed to submit' });
    }
  }

  @SubscribeMessage('pause-session')
  async handlePause(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const timer = this.timers.get(data.sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(data.sessionId);
    }
    this.pausedAt.set(data.sessionId, Date.now());
    await this.sessionService.updateStatus(data.sessionId, 'PAUSED');
    this.server.to(data.sessionId).emit('session-paused');
  }

  @SubscribeMessage('resume-session')
  async handleResume(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    await this.sessionService.updateStatus(data.sessionId, 'ACTIVE');

    const pausedSince = this.pausedAt.get(data.sessionId);
    if (pausedSince) {
      this.pausedAt.delete(data.sessionId);

      // Push the question's startTime forward by the pause duration so the
      // paused interval isn't counted against players' response times/scores.
      const pauseDuration = Date.now() - pausedSince;
      const questionCache = this.cache.get<any>(`question:${data.sessionId}`);
      if (questionCache) {
        questionCache.startTime += pauseDuration;
        this.cache.set(`question:${data.sessionId}`, questionCache);

        const remaining = this.timerRemaining.get(data.sessionId);
        if (remaining && remaining > 0) {
          this.startTimer(data.sessionId, questionCache.questionId, remaining);
        }
      }
    }

    this.server.to(data.sessionId).emit('session-resumed');
  }

  @SubscribeMessage('end-session')
  async handleEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const timer = this.timers.get(data.sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(data.sessionId);
    }
    this.timerRemaining.delete(data.sessionId);
    this.pausedAt.delete(data.sessionId);
    await this.sessionService.updateStatus(data.sessionId, 'FINISHED');
    const results = await this.sessionService.getResults(data.sessionId);
    this.server.to(data.sessionId).emit('quiz-finished', results);
  }

  @SubscribeMessage('next-question')
  async handleNext(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    this.handleStartQuestion(client, data);
  }

  @SubscribeMessage('show-leaderboard')
  async handleShowLeaderboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const leaderboard = await this.sessionService.getLeaderboard(data.sessionId);
    this.server.to(data.sessionId).emit('leaderboard-update', {
      rankings: leaderboard,
    });
  }

  private async endQuestion(sessionId: string, questionId: string) {
    // Close the question for answers immediately: submit-answer/submit-text-answer
    // check this cache entry, so clearing it here stops late submissions that
    // race the reveal, and it also stops a reconnecting client's session-sync
    // from replaying a question that has already ended.
    this.cache.del(`question:${sessionId}`);

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) return;

    const isText = question.questionType === 'text';

    if (isText) {
      const wordCloud = await this.sessionService.getWordCloudData(
        sessionId,
        questionId,
      );
      this.server.to(sessionId).emit('question-ended', {
        correctAnswer: -1,
        stats: { total: wordCloud.total, correct: 0, incorrect: 0, distribution: [0, 0, 0, 0], isSurvey: true },
        isSurvey: true,
        isText: true,
        wordCloud,
        optionTexts: [],
      });
    } else {
      const stats = await this.sessionService.getQuestionStats(
        sessionId,
        questionId,
      );
      const options = JSON.parse(question.options);

      this.server.to(sessionId).emit('question-ended', {
        correctAnswer: question.correctOption,
        stats,
        isSurvey: question.correctOption === -1,
        isText: false,
        optionTexts: options,
      });
    }
  }
}
