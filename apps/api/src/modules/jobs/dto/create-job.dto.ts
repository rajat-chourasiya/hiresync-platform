import { IsString, IsArray, IsOptional, MinLength } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsArray()
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsOptional()
  stages?: string[];
}