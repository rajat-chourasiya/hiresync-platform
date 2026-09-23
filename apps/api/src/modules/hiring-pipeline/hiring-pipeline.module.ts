import { Module } from '@nestjs/common';
import { HiringPipelineController } from './hiring-pipeline.controller';
import { HiringPipelineService } from './hiring-pipeline.service';
import { EmailModule } from '../email/email.module';

@Module({ imports: [EmailModule], controllers: [HiringPipelineController], providers: [HiringPipelineService] })
export class HiringPipelineModule {}