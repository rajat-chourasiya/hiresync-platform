import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsIn(['recruiter', 'interviewer', 'hiring_manager', 'org_admin'])
  @IsOptional()
  role?: string;
}