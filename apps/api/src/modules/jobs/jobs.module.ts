import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { AiModule } from '../ai/ai.module';
import { JobValidationService } from './validators/job-validation.service';

@Module({
  imports: [AiModule],
  controllers: [JobsController],
  providers: [JobsService, JobValidationService],
})
export class JobsModule {}