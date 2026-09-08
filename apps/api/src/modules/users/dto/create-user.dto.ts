import { IsEmail, IsString, IsIn, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsIn(['recruiter', 'interviewer', 'hiring_manager'])
  role!: string;
}