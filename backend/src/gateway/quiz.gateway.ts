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

  constructor(
    private sessionService: SessionService,
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async handleDisconnect(client: Socket) {
    const participant = await this.sessionService.removeParticipant(client.id);
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
  }

  @SubscribeMessage('join-room')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { pin: string; playerName: string; teamName?: string },
  ) {
    try {
      const session = await this.sessionService.findByPin(data.pin);
      if (session.status === 'FINISHED') {
        client.emit('error', { message: 'This quiz has already ended' });
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
      let remaining = question.timeLimit;
      const timer = setInterval(() => {
        remaining--;
        this.server.to(data.sessionId).emit('timer-update', { remaining });
        if (remaining <= 0) {
          clearInterval(timer);
          this.timers.delete(data.sessionId);
          this.endQuestion(data.sessionId, question.id);
        }
      }, 1000);

      this.timers.set(data.sessionId, timer);
    }
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
    if (timer) clearInterval(timer);
    await this.sessionService.updateStatus(data.sessionId, 'PAUSED');
    this.server.to(data.sessionId).emit('session-paused');
  }

  @SubscribeMessage('resume-session')
  async handleResume(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    await this.sessionService.updateStatus(data.sessionId, 'ACTIVE');
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
