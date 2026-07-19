import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  async importFromFile(
    userId: string,
    file: Express.Multer.File,
    quizTitle?: string,
  ) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    const nonEmptyRows = rows.filter((row: any) => {
      const text = row['Question'] || row['question'] || row['Q'];
      return typeof text === 'string' ? text.trim().length > 0 : !!text;
    });

    if (nonEmptyRows.length === 0) {
      throw new BadRequestException('File is empty');
    }

    const quiz = await this.prisma.quiz.create({
      data: {
        title: quizTitle || file.originalname.replace(/\.[^/.]+$/, ''),
        userId,
      },
    });

    const questions = nonEmptyRows.map((row: any, index: number) => {
      const questionText =
        row['Question'] || row['question'] || row['Q'] || '';
      const optA =
        row['Option A'] || row['option_a'] || row['A'] || '';
      const optB =
        row['Option B'] || row['option_b'] || row['B'] || '';
      const optC =
        row['Option C'] || row['option_c'] || row['C'] || '';
      const optD =
        row['Option D'] || row['option_d'] || row['D'] || '';
      const correct =
        row['Correct Answer'] || row['correct_answer'] || row['Answer'] || 'A';
      const timeLimit = parseInt(
        row['Time Limit'] || row['time_limit'] || '20',
        10,
      );
      const points = parseInt(row['Points'] || row['points'] || '1000', 10);

      const correctMap: Record<string, number> = {
        A: 0, B: 1, C: 2, D: 3,
        '0': 0, '1': 1, '2': 2, '3': 3,
        a: 0, b: 1, c: 2, d: 3,
      };

      return {
        quizId: quiz.id,
        text: String(questionText),
        options: JSON.stringify([
          String(optA),
          String(optB),
          String(optC),
          String(optD),
        ]),
        correctOption: correctMap[String(correct)] ?? 0,
        timeLimit: isNaN(timeLimit) ? 20 : timeLimit,
        points: isNaN(points) ? 1000 : points,
        order: index,
      };
    });

    await this.prisma.question.createMany({ data: questions });

    return this.prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async aiGenerate(userId: string, quizId: string, text: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new BadRequestException('Quiz not found');
    if (quiz.userId !== userId) throw new BadRequestException('Not your quiz');

    const questions = this.generateQuestionsFromText(text);

    const count = await this.prisma.question.count({
      where: { quizId },
    });

    const questionData = questions.map((q, index) => ({
      quizId,
      text: q.text,
      options: JSON.stringify(q.options),
      correctOption: q.correctOption,
      timeLimit: 20,
      points: 1000,
      order: count + index,
    }));

    await this.prisma.question.createMany({ data: questionData });

    return this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  private generateQuestionsFromText(text: string) {
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const questions: Array<{
      text: string;
      options: string[];
      correctOption: number;
    }> = [];

    for (const sentence of sentences.slice(0, 10)) {
      const words = sentence.split(/\s+/);
      if (words.length < 5) continue;

      const keyWordIndex = Math.floor(words.length / 2);
      const keyWord = words[keyWordIndex];
      const questionText = words
        .map((w, i) => (i === keyWordIndex ? '______' : w))
        .join(' ') + '?';

      const fillers = ['None of the above', 'All of the above', 'Not applicable'];
      const options = [keyWord, fillers[0], fillers[1], fillers[2]];
      const shuffled = options.sort(() => Math.random() - 0.5);

      questions.push({
        text: questionText,
        options: shuffled,
        correctOption: shuffled.indexOf(keyWord),
      });
    }

    return questions;
  }
}
