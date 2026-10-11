import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
}