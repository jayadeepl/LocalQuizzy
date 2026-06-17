import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@Injectable()
export class QuestionService {
  constructor(private prisma: PrismaService) {}

  async create(quizId: string, userId: string, dto: CreateQuestionDto) {
    await this.verifyQuizOwnership(quizId, userId);

    const count = await this.prisma.question.count({ where: { quizId } });

    return this.prisma.question.create({
      data: {
        quizId,
        text: dto.text,
        imageUrl: dto.imageUrl,
        options: JSON.stringify(dto.options),
        correctOption: dto.correctOption,
        timeLimit: dto.timeLimit || 20,
        points: dto.points || 1000,
        order: count,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateQuestionDto) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { quiz: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (question.quiz.userId !== userId) throw new ForbiddenException();

    return this.prisma.question.update({
      where: { id },
      data: {
        text: dto.text,
        imageUrl: dto.imageUrl,
        options: dto.options ? JSON.stringify(dto.options) : undefined,
        correctOption: dto.correctOption,
        timeLimit: dto.timeLimit,
        points: dto.points,
      },
    });
  }

  async remove(id: string, userId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { quiz: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (question.quiz.userId !== userId) throw new ForbiddenException();

    await this.prisma.question.delete({ where: { id } });
    return { deleted: true };
  }

  async reorder(quizId: string, userId: string, questionIds: string[]) {
    await this.verifyQuizOwnership(quizId, userId);

    const updates = questionIds.map((id, index) =>
      this.prisma.question.update({ where: { id }, data: { order: index } }),
    );
    await this.prisma.$transaction(updates);
    return { reordered: true };
  }

  private async verifyQuizOwnership(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.userId !== userId) throw new ForbiddenException();
  }
}
