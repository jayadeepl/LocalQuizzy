import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  quizId: string;

  @IsOptional()
  @IsBoolean()
  teamMode?: boolean;
}

export class JoinSessionDto {
  @IsString()
  pin: string;

  @IsString()
  playerName: string;

  @IsOptional()
  @IsString()
  teamName?: string;
}
