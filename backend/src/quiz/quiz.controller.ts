import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, Req,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuizDto, UpdateQuizDto } from './dto/quiz.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('quizzes')
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateQuizDto) {
    return this.quizService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.quizService.findAll(req.user.id);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.quizService.getStats(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.quizService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateQuizDto) {
    return this.quizService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.quizService.remove(id, req.user.id);
  }
}
