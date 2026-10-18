import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, UnrecoverableError, Worker } from 'bullmq';
import { aiAnalysisConnection } from '../queue/ai-analysis.queue';
import { QUESTION_GEN_QUEUE, QuestionGenJob } from './question-generation.queue';
import { PermanentGenerationError, QuestionsService } from './questions.service';

@Injectable()
export class QuestionGenerationProcessor implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;
  private logger = new Logger(QuestionGenerationProcessor.name);

  constructor(private questions: QuestionsService) {}

  onModuleInit() {
    this.worker = new Worker(QUESTION_GEN_QUEUE, (job: Job<QuestionGenJob>) => this.process(job), {
      connection: aiAnalysisConnection,
      concurrency: 2,
    });
    this.worker.on('completed', (job) => this.logger.log(`Question set ready (interview ${job.data.interviewId})`));
    this.worker.on('failed', (job, err) =>
      this.logger.warn(`Question generation failed (attempt ${job?.attemptsMade}/${job?.opts.attempts}): ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async process(job: Job<QuestionGenJob>) {
    const { interviewId, candidateId, roundType } = job.data;
    try {
      await this.questions.autoGenerate(interviewId, candidateId, roundType);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (err instanceof PermanentGenerationError) {
        await this.questions.markFailed(interviewId, candidateId, roundType, message);
        throw new UnrecoverableError(message); // retry ka fayda nahi
      }
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await this.questions.markFailed(interviewId, candidateId, roundType, message);
      }
      throw err; 
    }
  }
}