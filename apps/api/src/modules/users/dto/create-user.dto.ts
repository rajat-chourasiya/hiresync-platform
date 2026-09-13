import { IsEmail, IsString, IsIn, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsIn(['recruiter', 'interviewer', 'hiring_manager'])
  role!: string;
}