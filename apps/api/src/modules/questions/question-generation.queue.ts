import { Queue } from 'bullmq';
import { aiAnalysisConnection } from '../queue/ai-analysis.queue';

export const QUESTION_GEN_QUEUE = 'question-generation';

export interface QuestionGenJob {
  interviewId: string;
  candidateId: string;
  roundType: string;
}

export const questionGenQueue = new Queue(QUESTION_GEN_QUEUE, {
  connection: aiAnalysisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});


export function enqueueQuestionGeneration(data: QuestionGenJob) {
  return questionGenQueue.add('generate', data, { jobId: `${data.interviewId}__${data.candidateId}` });
}