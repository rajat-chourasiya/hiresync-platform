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

const MODELS = [
  process.env.GEMINI_MODEL_PRIMARY,
  process.env.GEMINI_MODEL_SECONDARY,
  process.env.GEMINI_MODEL_TERTIARY,
].filter((m): m is string => Boolean(m));

async function fetchResumeAsBase64(resumeUrl: string): Promise<string> {
  const response = await axios.get(resumeUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
}

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('503') || message.includes('500') || message.includes('502') ||
    message.includes('504') || message.includes('429') ||
    message.includes('quota') || message.includes('rate limit') || message.includes('overloaded') ||
    message.includes('unavailable')
  );
}

async function generateWithFallback(promptParts: any[]): Promise<string> {
  let lastError: unknown;

  for (const modelName of MODELS) {
    try {
      logger.log(`Trying model: ${modelName}`);
      const model = gemini.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(promptParts);
      const text = result.response.text();
      if (!text) throw new Error(`${modelName} returned empty response`);
      logger.log(`Success with model: ${modelName}`);
      return text;
    } catch (error) {
      lastError = error;
      logger.warn(`Model ${modelName} failed: ${error instanceof Error ? error.message : error}`);
      if (!isRetryable(error)) throw error; 
      
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError instanceof Error ? lastError.message : 'Unknown'}`);
}

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

    const responseText = await generateWithFallback([
      { text: RESUME_MATCH_SYSTEM_PROMPT },
      { text: jdBlock },
      { inlineData: { mimeType: 'application/pdf', data: resumeBase64 } },
    ]);

    const cleaned = responseText.replace(/```json|```/g, '').trim();
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