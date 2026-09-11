import { IsEmail, IsUUID, IsString } from 'class-validator';

export class RequestCandidateLoginDto {
  @IsUUID()
  orgId!: string;

  @IsEmail()
  email!: string;
}

export class VerifyCandidateLoginDto {
  @IsUUID()
  orgId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  otp!: string;
}