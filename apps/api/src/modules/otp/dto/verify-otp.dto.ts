import { IsEmail, IsString } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  purpose!: string;

  @IsString()
  otp!: string;
}