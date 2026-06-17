import { Module } from '@nestjs/common';
import { QuizGateway } from './quiz.gateway';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule],
  providers: [QuizGateway],
})
export class GatewayModule {}
