import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';

@Controller('sessions')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get(':id/export')
  async exportResults(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.exportService.exportResults(id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="quiz-results-${id}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get(':id/certificate/:participantId')
  async getCertificate(
    @Param('id') id: string,
    @Param('participantId') participantId: string,
  ) {
    return this.exportService.generateCertificate(id, participantId);
  }
}
