import {
  Controller, Post, Body, Param,
  UseGuards, Req, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post('quizzes/import')
  @UseInterceptors(FileInterceptor('file'))
  importQuiz(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    return this.importService.importFromFile(req.user.id, file, title);
  }

  @Post('quizzes/:id/ai-generate')
  aiGenerate(
    @Param('id') id: string,
    @Req() req: any,
    @Body('text') text: string,
  ) {
    return this.importService.aiGenerate(req.user.id, id, text);
  }
}
