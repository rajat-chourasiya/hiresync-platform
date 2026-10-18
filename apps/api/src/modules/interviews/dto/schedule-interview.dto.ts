import {
  IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsString,
  Validate, ValidatorConstraint, ValidatorConstraintInterface,
} from 'class-validator';
import { VALID_ROUND_TYPES } from '../../questions/constants/difficulty';

export const VALID_TOOLS = ['chat', 'video', 'code_execution', 'whiteboard'];

@ValidatorConstraint({ name: 'isFutureDate', async: false })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string) {
    return new Date(dateString) > new Date();
  }
  defaultMessage() {
    return 'scheduledStart must be a future date/time';
  }
}

export class ScheduleInterviewDto {
  @IsArray()
  applicationIds!: string[];

  @IsString()
  @IsIn(['single_candidate', 'group_discussion'])
  interviewType!: string;

  @IsArray()
  interviewerIds!: string[];

  @IsArray()
  @IsOptional()
  enabledTools?: string[];

  // Kis type ke questions auto-generate hon (default technical_interview)
  @IsOptional()
  @IsIn(VALID_ROUND_TYPES)
  roundType?: string;

  // false bhejne par auto-generation band (default true)
  @IsOptional()
  @IsBoolean()
  autoGenerateQuestions?: boolean;

  @IsDateString()
  @Validate(IsFutureDateConstraint)
  scheduledStart!: string;

  @IsDateString()
  scheduledEnd!: string;
}