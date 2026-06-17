import { IsString, IsInt, IsOptional, IsArray, Min, Max } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsArray()
  options: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  correctOption: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  timeLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
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
  @IsArray()
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  correctOption?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  timeLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  points?: number;
}

export class ReorderDto {
  @IsArray()
  questionIds: string[];
}
