import { IsString } from 'class-validator';
import { IsTimezone } from '../helpers/timezone';

export class UpdateTimezoneDto {
  @IsString()
  @IsTimezone()
  timezone!: string;
}
