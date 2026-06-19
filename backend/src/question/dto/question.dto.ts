import { IsString, IsInt, IsOptional, IsArray, Min, Max, IsIn } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['mcq', 'text'])
  questionType?: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(3)
  correctOption?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  timeLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['mcq', 'text'])
  questionType?: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(-1)
  @Max(3)
  correctOption?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  timeLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;
}

export class ReorderDto {
  @IsArray()
  questionIds: string[];
}
