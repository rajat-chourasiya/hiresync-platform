
import { Queue, Worker } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { aiAnalysisConnection } from './ai-analysis.queue';
import {
  INTERVIEW_ACTIVE_STATUSES,
  syncInterviewLifecycle,
} from '../../common/helpers/interview-status';

const logger = new Logger('InterviewStatusWorker');
const prisma = new PrismaClient();

export const interviewStatusQueue = new Queue(
  'interview-status',
  { connection: aiAnalysisConnection },
);

export const interviewStatusWorker = new Worker(
  'interview-status',
  async () => {
    const active = await prisma.interview.findMany({
      where: {
        status: { in: INTERVIEW_ACTIVE_STATUSES },
      },
      select: { id: true },
    });

    let changed = 0;

    for (const { id } of active) {
      const result = await syncInterviewLifecycle(prisma, id);

      if (result?.changed) changed++;
    }

    if (changed > 0) {
      logger.log(`Synced ${changed} interview status change(s)`);
    }
  },
  {
    connection: aiAnalysisConnection,
    concurrency: 1,
  },
);

interviewStatusQueue
  .upsertJobScheduler(
    'sync-all',
    { every: 60_000 },
    {
      name: 'sync-all',
      data: {},
      opts: {
        removeOnComplete: true,
        removeOnFail: 20,
      },
    },
  )
  .catch((err: Error) => {
    logger.error(`Could not schedule status sync: ${err.message}`);
  });
