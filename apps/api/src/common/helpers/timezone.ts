import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Validates whether a string is a valid IANA timezone identifier
 * (e.g. 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'UTC').
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

@ValidatorConstraint({ name: 'isTimezone', async: false })
export class IsTimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidTimezone(value);
  }

  defaultMessage(): string {
    return 'timezone must be a valid IANA timezone (e.g. "Asia/Kolkata", "America/New_York")';
  }
}

/**
 * Class-validator decorator for IANA timezone fields.
 */
export function IsTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTimezoneConstraint,
    });
  };
}

/**
 * Formats a Date in the recipient's IANA timezone with short zone abbreviation
 * (e.g. "Thursday, 26 November 2026, 02:30 am IST").
 * Falls back to DEFAULT_TIMEZONE if the provided timezone is missing or invalid.
 */
export function formatDateInTimezone(date: Date, timeZone?: string | null): string {
  const safeZone = timeZone && isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
  return date.toLocaleString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: safeZone,
    timeZoneName: 'short',
  });
}
