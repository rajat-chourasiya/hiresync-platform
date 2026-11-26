import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { IsTimezone } from '../../../common/helpers/timezone';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  orgName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsTimezone()
  @IsOptional()
  timezone?: string;
}