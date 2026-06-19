import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateSessionDto } from './dto/session.dto';
import * as QRCode from 'qrcode';

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async create(userId: string, dto: CreateSessionDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: dto.quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.userId !== userId) throw new BadRequestException('Not your quiz');
    if (quiz.questions.length === 0)
      throw new BadRequestException('Quiz has no questions');

    let pin = this.generatePin();
    while (await this.prisma.quizSession.findUnique({ where: { pin } })) {
      pin = this.generatePin();
    }

    const session = await this.prisma.quizSession.create({
      data: {
        quizId: dto.quizId,
        pin,
        teamMode: dto.teamMode || false,
      },
      include: {
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
      },
    });

    const joinUrl = `http://localhost:3000/join?pin=${pin}`;
    const qrCode = await QRCode.toDataURL(joinUrl, { width: 300, margin: 2 });

    this.cache.set(`session:${session.id}`, {
      status: 'LOBBY',
      currentQuestion: -1,
      questions: quiz.questions,
      responses: new Map(),
    });

    return { ...session, joinUrl, qrCode };
  }

  async findOne(id: string) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id },
      include: {
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
        participants: { orderBy: { score: 'desc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async findByPin(pin: string) {
    const session = await this.prisma.quizSession.findUnique({
      where: { pin },
      include: { quiz: { select: { title: true } } },
    });
    if (!session) throw new NotFoundException('Invalid PIN');
    if (session.status === 'FINISHED')
      throw new BadRequestException('Session has ended');
    return session;
  }

  async findAll(userId: string) {
    return this.prisma.quizSession.findMany({
      where: { quiz: { userId } },
      include: {
        quiz: { select: { title: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addParticipant(
    sessionId: string,
    name: string,
    socketId: string,
    teamName?: string,
  ) {
    return this.prisma.participant.create({
      data: { sessionId, name, socketId, teamName },
    });
  }

  async removeParticipant(socketId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { socketId },
    });
    if (participant) {
      await this.prisma.participant.update({
        where: { id: participant.id },
        data: { socketId: null },
      });
    }
    return participant;
  }

  async getResults(id: string) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id },
      include: {
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
        participants: { orderBy: { score: 'desc' } },
        responses: { include: { participant: true, question: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const totalQuestions = session.quiz.questions.length;
    const participants = session.participants.map((p) => {
      const pResponses = session.responses.filter(
        (r) => r.participantId === p.id,
      );
      const correct = pResponses.filter((r) => r.isCorrect).length;
      return {
        ...p,
        accuracy: totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0,
        totalCorrect: correct,
        totalQuestions,
      };
    });

    return {
      session,
      participants,
      totalQuestions,
      winner: participants[0] || null,
      topThree: participants.slice(0, 3),
    };
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.quizSession.update({
      where: { id },
      data: {
        status,
        ...(status === 'ACTIVE' ? { startedAt: new Date() } : {}),
        ...(status === 'FINISHED' ? { endedAt: new Date() } : {}),
      },
    });
  }

  async updateCurrentQuestion(id: string, questionIndex: number) {
    return this.prisma.quizSession.update({
      where: { id },
      data: { currentQuestion: questionIndex },
    });
  }

  async submitResponse(
    sessionId: string,
    participantId: string,
    questionId: string,
    answer: number,
    responseTime: number,
    scoringMode: string = 'time',
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found');

    const existing = await this.prisma.response.findFirst({
      where: { sessionId, participantId, questionId },
    });
    if (existing) throw new BadRequestException('Already answered');

    const isSurvey = question.correctOption === -1;
    const isCorrect = isSurvey ? false : answer === question.correctOption;

    let score = 0;
    if (!isSurvey && isCorrect) {
      if (scoringMode === 'correct' || question.timeLimit === 0) {
        score = question.points;
      } else {
        score = Math.round(
          question.points * (1 - responseTime / question.timeLimit),
        );
      }
    }

    const response = await this.prisma.response.create({
      data: {
        sessionId,
        participantId,
        questionId,
        answer,
        isCorrect,
        responseTime,
        score,
      },
    });

    if (isCorrect && score > 0) {
      await this.prisma.participant.update({
        where: { id: participantId },
        data: { score: { increment: score } },
      });
    }

    return { ...response, isSurvey };
  }

  async submitTextResponse(
    sessionId: string,
    participantId: string,
    questionId: string,
    textAnswer: string,
    responseTime: number,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Question not found');

    const existing = await this.prisma.response.findFirst({
      where: { sessionId, participantId, questionId },
    });
    if (existing) throw new BadRequestException('Already answered');

    return this.prisma.response.create({
      data: {
        sessionId,
        participantId,
        questionId,
        answer: -1,
        textAnswer: textAnswer.trim(),
        isCorrect: false,
        responseTime,
        score: 0,
      },
    });
  }

  async getWordCloudData(sessionId: string, questionId: string) {
    const responses = await this.prisma.response.findMany({
      where: { sessionId, questionId, textAnswer: { not: null } },
      select: { textAnswer: true },
    });

    const freq = new Map<string, number>();
    for (const r of responses) {
      if (!r.textAnswer) continue;
      const word = r.textAnswer.toLowerCase().trim();
      if (word) {
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    }

    const words = Array.from(freq.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count);

    return { words, total: responses.length };
  }

  async getLeaderboard(sessionId: string) {
    return this.prisma.participant.findMany({
      where: { sessionId },
      orderBy: { score: 'desc' },
      take: 10,
    });
  }

  async getQuestionStats(sessionId: string, questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    const responses = await this.prisma.response.findMany({
      where: { sessionId, questionId },
    });

    const isSurvey = question ? question.correctOption === -1 : false;
    const total = responses.length;
    const correct = responses.filter((r) => r.isCorrect).length;
    const distribution = [0, 0, 0, 0];
    responses.forEach((r) => {
      if (r.answer >= 0 && r.answer <= 3) distribution[r.answer]++;
    });

    return { total, correct, incorrect: total - correct, distribution, isSurvey };
  }
}
