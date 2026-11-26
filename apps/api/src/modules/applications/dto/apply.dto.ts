import { IsEmail, IsString, IsOptional, IsArray, MinLength, IsUrl } from 'class-validator';
import { IsTimezone } from '../../../common/helpers/timezone';

export class ApplyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsArray()
  @IsOptional()
  skills?: string[];

  @IsUrl()
  resumeUrl!: string;

  @IsString() 
  resumeHash!: string;

  @IsString()
  @IsOptional()
  otp?: string;

  @IsString()
  @IsTimezone()
  @IsOptional()
  timezone?: string;
}