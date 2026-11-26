import { IsEmail, IsString, IsIn, MinLength, IsOptional } from 'class-validator';
import { IsTimezone } from '../../../common/helpers/timezone';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsIn(['recruiter', 'interviewer', 'hiring_manager'])
  role!: string;

  @IsString()
  @IsTimezone()
  @IsOptional()
  timezone?: string;
}