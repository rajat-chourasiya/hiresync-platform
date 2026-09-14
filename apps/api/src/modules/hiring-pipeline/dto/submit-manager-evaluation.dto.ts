import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CriterionScoreDto } from './submit-interviewer-feedback.dto';
import { RECOMMENDATIONS } from '../constants/pipeline-criteria';

export class SubmitManagerEvaluationDto {
  @IsBoolean() isLeadershipRole!: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CriterionScoreDto) criteria!: CriterionScoreDto[];
  @IsString() @IsOptional() riskNotes?: string;
  @IsIn(['low', 'medium', 'high']) @IsOptional() riskSeverity?: string;
  @IsIn(RECOMMENDATIONS) @IsOptional() recommendation?: string;
  @IsString() @IsOptional() overrideReason?: string; // mandatory only if overriding computed tier
}