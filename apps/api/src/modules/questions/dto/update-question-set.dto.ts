import { IsIn, IsOptional } from 'class-validator';

export class UpdateQuestionSetDto {
  @IsOptional()
  questions?: unknown;

  // draft → approved: reviewer ne approve kar diya
  @IsIn(['draft', 'approved'])
  @IsOptional()
  status?: string;
}