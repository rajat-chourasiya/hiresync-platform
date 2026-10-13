import { Module } from '@nestjs/common';
import { CodeExecutionController } from './code-execution.controller';
import { CodeExecutionService } from './code-execution.service';
import { CodeEvaluationService } from './code-evaluation.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [CodeExecutionController],
  providers: [CodeExecutionService, CodeEvaluationService],
  exports: [CodeExecutionService],
})
export class CodeExecutionModule {}
