import { IsIn, IsOptional } from 'class-validator';

export class UpdateQuestionSetDto {
  @IsOptional()
  questions?: unknown;

  @IsIn(['draft', 'approved'])
  @IsOptional()
  status?: string;
}