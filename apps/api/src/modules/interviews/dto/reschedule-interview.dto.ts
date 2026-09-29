import { IsDateString, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(dateString: string) {
    return new Date(dateString) > new Date();
  }
  defaultMessage() {
    return 'newScheduledStart must be a future date/time';
  }
}

export class RescheduleInterviewDto {
  @IsDateString()
  @Validate(IsFutureDateConstraint)
  newScheduledStart!: string;

  @IsDateString()
  newScheduledEnd!: string;
}