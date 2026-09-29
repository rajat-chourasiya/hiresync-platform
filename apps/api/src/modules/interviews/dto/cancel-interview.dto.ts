import { IsString, IsOptional } from 'class-validator';

export class CancelInterviewDto {
  @IsString()
  @IsOptional()
  reason?: string;
}