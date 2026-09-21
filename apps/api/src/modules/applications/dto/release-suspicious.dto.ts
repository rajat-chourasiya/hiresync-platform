import { IsIn } from 'class-validator';

export class ReleaseSuspiciousDto {
  @IsIn(['proceed', 'reject'])
  decision!: string;
}