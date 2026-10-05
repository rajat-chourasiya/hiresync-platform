import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class RegenerateSectionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  sectionTypes!: string[];
}