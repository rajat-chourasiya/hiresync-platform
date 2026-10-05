import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
} from 'class-validator';

export class GenerateJobDescriptionDto {
  @IsOptional()
  @IsIn(['neutral', 'formal', 'casual_startup', 'enthusiastic'])
  tone?: string;

  @IsOptional()
  @IsIn(['short', 'standard', 'detailed'])
  targetLength?: string;

  @IsOptional()
  @IsInt()
  maxCharacters?: number;

  @IsOptional()
  @IsBoolean()
  includeEmojis?: boolean;

  @IsOptional()
  @IsBoolean()
  includeHashtags?: boolean;

  @IsOptional()
  @IsIn(['job_board', 'linkedin', 'website'])
  platform?: string;
}