import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CriterionScoreDto } from './submit-interviewer-feedback.dto';
import { RECOMMENDATIONS } from '../constants/pipeline-criteria';

export class SubmitRecruiterEvaluationDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CriterionScoreDto) criteria!: CriterionScoreDto[];
  @IsIn(['immediate', 'under_30d', 'under_60d', 'flexible']) noticePeriod!: string;
  @IsIn(['within_budget', 'negotiable', 'above_budget']) salaryFit!: string;
  @IsIn(RECOMMENDATIONS) @IsOptional() recommendation?: string;
}