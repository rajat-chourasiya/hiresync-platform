import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const aiAnalysisConnection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null, 
});

export const aiAnalysisQueue = new Queue('ai-analysis', {
  connection: aiAnalysisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});