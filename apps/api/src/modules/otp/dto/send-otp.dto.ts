import { IsEmail, IsString } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  purpose!: string;
}