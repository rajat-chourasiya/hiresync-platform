import { IsString, Matches } from 'class-validator';

export class CompareCandidatesQueryDto {
  @IsString()
  @Matches(/^[0-9a-fA-F-]{36}(,[0-9a-fA-F-]{36}){1,3}$/, {
    message: 'candidateIds must be 2 to 4 comma-separated candidate UUIDs',
  })
  candidateIds!: string;
}