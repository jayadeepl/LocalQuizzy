import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { QuizModule } from './quiz/quiz.module';
import { QuestionModule } from './question/question.module';
import { SessionModule } from './session/session.module';
import { GatewayModule } from './gateway/gateway.module';
import { ImportModule } from './import/import.module';
import { ExportModule } from './export/export.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    AuthModule,
    QuizModule,
    QuestionModule,
    SessionModule,
    GatewayModule,
    ImportModule,
    ExportModule,
    UploadModule,
  ],
})
export class AppModule {}
