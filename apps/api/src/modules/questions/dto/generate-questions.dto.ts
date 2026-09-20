import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { VALID_ROUND_TYPES } from '../constants/difficulty';

export class GenerateQuestionsDto {
  @IsIn(VALID_ROUND_TYPES)
  roundType!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  numQuestions?: number;
}