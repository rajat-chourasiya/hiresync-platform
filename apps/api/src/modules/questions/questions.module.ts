import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { AiModule } from '../ai/ai.module';
import { InterviewsModule } from '../interviews/interviews.module';
import { CodeExecutionModule } from '../code-execution/code-execution.module';
import { QuestionGenerationProcessor } from './question-generation.processor';

@Module({
  imports: [AiModule, InterviewsModule, CodeExecutionModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, QuestionGenerationProcessor],
})
export class QuestionsModule {}