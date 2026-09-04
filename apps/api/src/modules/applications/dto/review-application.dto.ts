import { IsString, IsIn, IsOptional } from 'class-validator';

export class ReviewApplicationDto {
  @IsString()
  @IsIn(['shortlisted', 'rejected', 'on_hold'])
  status!: string;

  @IsString()
  @IsOptional()
  reviewNote?: string;
}