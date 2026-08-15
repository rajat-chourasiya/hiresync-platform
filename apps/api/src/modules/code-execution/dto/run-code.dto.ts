import { IsNotEmpty, IsString } from 'class-validator';

export class RunCodeDto {
  @IsString()
  @IsNotEmpty()
  language!: string;

  @IsString()
  @IsNotEmpty()
  version!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}