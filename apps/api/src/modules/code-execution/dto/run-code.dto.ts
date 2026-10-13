import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class RunCodeDto {
  @IsString()
  @MinLength(1)
  language!: string;

  @IsString()
  @Matches(/^(\*|\d+(\.(\d+|x|\*)){0,2})$/, {
    message: 'version must look like "3.12.0", "3.x" or "*" (not "Python 3.x")',
  })
  version!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  stdin?: string;


  @IsOptional()
  @IsBoolean()
  evaluate?: boolean;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9)
  problemIndex?: number;
}