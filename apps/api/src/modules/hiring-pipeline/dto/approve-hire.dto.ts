import { IsIn, IsString, IsOptional } from 'class-validator';

export class ApproveHireDto {
  @IsIn(['approve', 'reject'])
  action!: string;

  @IsString()
  @IsOptional()
  note?: string;
}