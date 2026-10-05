import { IsString, MinLength } from 'class-validator';

export class EditJobDescriptionDto {
  @IsString()
  @MinLength(3)
  instruction!: string;
}