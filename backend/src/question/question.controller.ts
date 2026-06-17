import {
  Controller, Post, Put, Delete,
  Body, Param, UseGuards, Req,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto, UpdateQuestionDto, ReorderDto } from './dto/question.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class QuestionController {
  constructor(private questionService: QuestionService) {}

  @Post('quizzes/:quizId/questions')
  create(
    @Param('quizId') quizId: string,
    @Req() req: any,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionService.create(quizId, req.user.id, dto);
  }

  @Put('questions/:id')
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, req.user.id, dto);
  }

  @Delete('questions/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.questionService.remove(id, req.user.id);
  }

  @Put('quizzes/:quizId/questions/reorder')
  reorder(
    @Param('quizId') quizId: string,
    @Req() req: any,
    @Body() dto: ReorderDto,
  ) {
    return this.questionService.reorder(quizId, req.user.id, dto.questionIds);
  }
}
