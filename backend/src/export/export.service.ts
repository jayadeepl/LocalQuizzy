import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportResults(sessionId: string): Promise<Buffer> {
    const session = await this.prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
        participants: { orderBy: { score: 'desc' } },
        responses: true,
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Team', key: 'team', width: 15 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Accuracy', key: 'accuracy', width: 12 },
    ];

    session.participants.forEach((p, i) => {
      const pResponses = session.responses.filter(
        (r) => r.participantId === p.id,
      );
      const correct = pResponses.filter((r) => r.isCorrect).length;
      const total = session.quiz.questions.length;
      summarySheet.addRow({
        rank: i + 1,
        name: p.name,
        team: p.teamName || '-',
        score: p.score,
        accuracy: total > 0 ? `${Math.round((correct / total) * 100)}%` : '0%',
      });
    });

    const detailSheet = workbook.addWorksheet('Responses');
    detailSheet.columns = [
      { header: 'Participant', key: 'participant', width: 20 },
      { header: 'Question', key: 'question', width: 40 },
      { header: 'Answer', key: 'answer', width: 15 },
      { header: 'Correct', key: 'correct', width: 10 },
      { header: 'Time (s)', key: 'time', width: 10 },
      { header: 'Score', key: 'score', width: 10 },
    ];

    for (const response of session.responses) {
      const participant = session.participants.find(
        (p) => p.id === response.participantId,
      );
      const question = session.quiz.questions.find(
        (q) => q.id === response.questionId,
      );
      if (!participant || !question) continue;

      const options = JSON.parse(question.options);
      detailSheet.addRow({
        participant: participant.name,
        question: question.text,
        answer: options[response.answer] || 'N/A',
        correct: response.isCorrect ? 'Yes' : 'No',
        time: response.responseTime.toFixed(1),
        score: response.score,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateCertificate(
    sessionId: string,
    participantId: string,
  ): Promise<{
    name: string;
    quizTitle: string;
    score: number;
    rank: number;
    totalParticipants: number;
    date: string;
  }> {
    const session = await this.prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: true,
        participants: { orderBy: { score: 'desc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const participant = session.participants.find(
      (p) => p.id === participantId,
    );
    if (!participant) throw new NotFoundException('Participant not found');

    const rank =
      session.participants.findIndex((p) => p.id === participantId) + 1;

    return {
      name: participant.name,
      quizTitle: session.quiz.title,
      score: participant.score,
      rank,
      totalParticipants: session.participants.length,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  }
}
