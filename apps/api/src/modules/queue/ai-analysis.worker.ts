import { Worker } from 'bullmq';
import { Logger } from '@nestjs/common';
import { aiAnalysisConnection } from './ai-analysis.queue';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { RESUME_MATCH_SYSTEM_PROMPT, buildJobDescriptionBlock } from '../ai/prompts/resume-match-v3.prompt';

const logger = new Logger('AiAnalysisWorker');
const prisma = new PrismaClient();
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

async function fetchResumeAsBase64(resumeUrl: string): Promise<string> {
  const response = await axios.get(resumeUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
}

const CANDIDATE_LEVEL_TO_MONTHS_HINT: Record<string, number> = {
  FRESHER: 0, L1: 6, L2: 18, L3: 36, L4: 54, L5: 90, L6: 150,
};

export const aiAnalysisWorker = new Worker(
  'ai-analysis',
  async (job) => {
    const { applicationId } = job.data as { applicationId: string };

    const existing = await prisma.aiResumeAnalysis.findUnique({ where: { applicationId } });
    if (existing) {
      logger.log(`Skipping ${applicationId} — already analyzed`);
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true, candidate: true },
    });
    if (!application) return;

    await prisma.application.update({ where: { id: applicationId }, data: { aiAnalysisStatus: 'processing' } });

    const resumeBase64 = await fetchResumeAsBase64(application.candidate.resumeUrl as string);
    const jdBlock = buildJobDescriptionBlock(application.job.title, application.job.description, application.job.skills);

    const model = gemini.getGenerativeModel({ model: process.env.GEMINI_MODEL_PRIMARY as string });
    const result = await model.generateContent([
      { text: RESUME_MATCH_SYSTEM_PROMPT },
      { text: jdBlock },
      { inlineData: { mimeType: 'application/pdf', data: resumeBase64 } },
    ]);

    const cleaned = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (typeof parsed.matchScore !== 'number' || !parsed.tier) {
      throw new Error('AI response missing required fields (matchScore/tier)');
    }

    await prisma.aiResumeAnalysis.create({
      data: {
        orgId: application.orgId,
        jobId: application.jobId,
        candidateId: application.candidateId,
        applicationId: application.id,
        modelProvider: 'google',
        modelName: process.env.GEMINI_MODEL_PRIMARY as string,
        promptVersion: 'resume-match-v3',
        matchScore: parsed.matchScore,
        tier: parsed.tier,
        candidateLevel: parsed.candidateLevel ?? null,
        roleCategory: parsed.roleCategory ?? null,
        experienceMode: parsed.experienceMode ?? null,
        relevantExperienceMonths: parsed.experience?.relevantMonths ?? null,
        totalExperienceMonths: parsed.experience?.totalMonths ?? null,
        reviewStatus: 'pending',
        fullAnalysis: parsed,
      },
    });

    await prisma.application.update({ where: { id: applicationId }, data: { aiAnalysisStatus: 'done' } });
  },
  { connection: aiAnalysisConnection, concurrency: 3 },
);

aiAnalysisWorker.on('failed', async (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    const { applicationId } = job.data as { applicationId: string };
    await prisma.application.update({ where: { id: applicationId }, data: { aiAnalysisStatus: 'failed' } });
  }
});