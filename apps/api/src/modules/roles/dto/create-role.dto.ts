import { IsString, IsArray, ArrayNotEmpty, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionNames!: string[];
}
