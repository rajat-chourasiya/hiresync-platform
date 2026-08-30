import { Worker } from 'bullmq';
import { Logger } from '@nestjs/common';
import { aiAnalysisConnection } from './ai-analysis.queue';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const logger = new Logger('AiAnalysisWorker');
const prisma = new PrismaClient();
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

function buildPrompt(jobTitle: string, jobSkills: string[], candidateSkills: string[]) {
  return `You are a resume screening assistant. Compare the candidate against the job.
Job Title: ${jobTitle}
Required Skills: ${jobSkills.join(', ')}
Candidate Skills: ${candidateSkills.join(', ')}
Return ONLY valid JSON: { "score": <0-100>, "confidence": <0-100>, "matchedSkills": [], "missingSkills": [], "strengths": [], "risks": [] }`;
}

export const aiAnalysisWorker = new Worker(
  'ai-analysis',
  async (job) => {
    const { applicationId } = job.data as { applicationId: string };

    const existing = await prisma.aiResumeAnalysis.findUnique({ where: { applicationId } });
    if (existing) {
      logger.log(`Skipping ${applicationId} — already analyzed (idempotency)`);
      return;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true, candidate: true },
    });
    if (!application) return;

    await prisma.application.update({ where: { id: applicationId }, data: { aiAnalysisStatus: 'processing' } });

    const model = gemini.getGenerativeModel({ model: process.env.GEMINI_MODEL_PRIMARY as string });
    const result = await model.generateContent(
      buildPrompt(application.job.title, application.job.skills, application.candidate.skills),
    );
    const cleaned = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    await prisma.aiResumeAnalysis.create({
      data: {
        orgId: application.orgId,
        jobId: application.jobId,
        candidateId: application.candidateId,
        applicationId: application.id,
        modelProvider: 'google',
        modelName: process.env.GEMINI_MODEL_PRIMARY as string,
        promptVersion: 'resume-analysis-v1',
        score: parsed.score,
        confidence: parsed.confidence,
        matchedSkills: parsed.matchedSkills,
        missingSkills: parsed.missingSkills,
        strengths: parsed.strengths,
        risks: parsed.risks,
        reviewStatus: 'pending',
        rawResponse: parsed,
      },
    });

    await prisma.application.update({ where: { id: applicationId }, data: { aiAnalysisStatus: 'done' } });
  },
  { connection: aiAnalysisConnection, concurrency: 3 }, // max 3 parallel Gemini calls
);

aiAnalysisWorker.on('failed', async (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    const { applicationId } = job.data as { applicationId: string };
    await prisma.application.update({ where: { id: applicationId }, data: { aiAnalysisStatus: 'failed' } });
  }
});