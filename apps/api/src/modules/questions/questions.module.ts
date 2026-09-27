import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { AiModule } from '../ai/ai.module';
import { InterviewsModule } from '../interviews/interviews.module';

@Module({
  imports: [AiModule, InterviewsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}