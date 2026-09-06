import { IsString, IsArray, IsDateString } from 'class-validator';

export class ScheduleInterviewDto {
  @IsString()
  applicationId!: string;

  @IsArray()
  interviewerIds!: string[];

  @IsDateString()
  scheduledStart!: string;

  @IsDateString()
  scheduledEnd!: string;
}