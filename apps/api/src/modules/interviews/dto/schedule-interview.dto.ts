import { IsString, IsArray, IsDateString, Validate, ValidatorConstraint, ValidatorConstraintInterface, IsIn, IsOptional } from 'class-validator';

const VALID_TOOLS = ['chat', 'video', 'code_execution', 'whiteboard'];

@ValidatorConstraint({ name: 'isFutureDate', async: false })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string) {
    return new Date(dateString) > new Date();
  }
  defaultMessage() {
    return 'scheduledStart must be a future date/time, not in the past';
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

  @IsDateString()
  @Validate(IsFutureDateConstraint)
  scheduledStart!: string;

  @IsDateString()
  scheduledEnd!: string;
}

export { VALID_TOOLS };