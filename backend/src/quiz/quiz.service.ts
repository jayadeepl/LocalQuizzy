import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto, UpdateQuizDto } from './dto/quiz.dto';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateQuizDto) {
    return this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description || '',
        settings: dto.settings || '{}',
        userId,
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll(userId: string) {
    return this.prisma.quiz.findMany({
      where: { userId },
      include: {
        _count: { select: { questions: true, sessions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { _count: { select: { participants: true } } },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.userId !== userId) throw new ForbiddenException();
    return quiz;
  }

  async update(id: string, userId: string, dto: UpdateQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.userId !== userId) throw new ForbiddenException();

    return this.prisma.quiz.update({
      where: { id },
      data: dto,
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.userId !== userId) throw new ForbiddenException();

    await this.prisma.quiz.delete({ where: { id } });
    return { deleted: true };
  }

  async getStats(userId: string) {
    const [totalQuizzes, totalSessions, totalParticipants] = await Promise.all([
      this.prisma.quiz.count({ where: { userId } }),
      this.prisma.quizSession.count({
        where: { quiz: { userId } },
      }),
      this.prisma.participant.count({
        where: { session: { quiz: { userId } } },
      }),
    ]);
    return { totalQuizzes, totalSessions, totalParticipants };
  }
}
