import { Module } from '@nestjs/common';
import { HiringPipelineController } from './hiring-pipeline.controller';
import { HiringPipelineService } from './hiring-pipeline.service';

@Module({ controllers: [HiringPipelineController], providers: [HiringPipelineService] })
export class HiringPipelineModule {}