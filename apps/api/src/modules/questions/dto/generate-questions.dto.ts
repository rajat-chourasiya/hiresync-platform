import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { VALID_ROUND_TYPES } from '../constants/difficulty';

export class GenerateQuestionsDto {
  // Optional: agar na diya jaye to interview.roundType automatically use hoga
  @IsIn(VALID_ROUND_TYPES)
  @IsOptional()
  roundType?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  numQuestions?: number;

  // Reviewer assignment: recruiter choose kare ki questions kaun review karega
  // 'self' → recruiter khud review karega
  // 'interviewer' → interviewerId se specific interviewer ko assign karega
  @IsIn(['self', 'interviewer'])
  @IsOptional()
  reviewerType?: 'self' | 'interviewer';

  // Required only when reviewerType === 'interviewer'
  // Must be one of the interview's assigned interviewerIds
  @IsString()
  @IsOptional()
  reviewerId?: string;
}