import { Module } from '@nestjs/common';
import { CodeExecutionController } from './code-execution.controller';
import { CodeExecutionService } from './code-execution.service';
import { CodeEvaluationService } from './code-evaluation.service';
import { AiModule } from '../ai/ai.module';
import { ProblemVerifierService } from './problem-verifier.service';

@Module({
  imports: [AiModule],
  controllers: [CodeExecutionController],
  providers: [CodeExecutionService, CodeEvaluationService,ProblemVerifierService],
  exports: [CodeExecutionService, ProblemVerifierService],
})
export class CodeExecutionModule {}
