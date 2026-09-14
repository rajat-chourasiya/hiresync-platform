import { IsString, IsArray, IsOptional, IsNumber, Min, Max, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { RECOMMENDATIONS } from '../constants/pipeline-criteria';

class CriterionScoreDto {
  @IsString() key!: string;
  @IsNumber() @Min(1) @Max(5) score!: number;
  @IsString() evidence!: string;
}

export class SubmitInterviewerFeedbackDto {
  @IsString() candidateId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CriterionScoreDto) criteria!: CriterionScoreDto[];
  @IsString() @IsOptional() strengths?: string;
  @IsString() @IsOptional() weaknesses?: string;
  @IsString() @IsOptional() behavioralNotes?: string;
  @IsIn(RECOMMENDATIONS) recommendation!: string;
}

export { CriterionScoreDto };