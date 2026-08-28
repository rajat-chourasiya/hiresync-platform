import { IsEmail, IsString, IsOptional, IsArray, MinLength } from 'class-validator';

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

  @IsString()
  resumeUrl!: string;
}