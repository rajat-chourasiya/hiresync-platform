import { IsString, IsArray, IsDateString, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

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
  @IsString()
  applicationId!: string;

  @IsArray()
  interviewerIds!: string[];

  @IsDateString()
  @Validate(IsFutureDateConstraint)
  scheduledStart!: string;

  @IsDateString()
  scheduledEnd!: string;
}