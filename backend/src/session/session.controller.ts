import {
  Controller, Get, Post, Param, Body,
  UseGuards, Req, Query,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sessions')
export class SessionController {
  constructor(private sessionService: SessionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateSessionDto) {
    return this.sessionService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any) {
    return this.sessionService.findAll(req.user.id);
  }

  @Get('pin/:pin')
  findByPin(@Param('pin') pin: string) {
    return this.sessionService.findByPin(pin);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionService.findOne(id);
  }

  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.sessionService.getResults(id);
  }

  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string) {
    return this.sessionService.getLeaderboard(id);
  }
}
