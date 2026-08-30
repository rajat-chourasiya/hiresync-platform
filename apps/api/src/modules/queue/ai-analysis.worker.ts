import { Worker } from 'bullmq';
import { Logger } from '@nestjs/common';
import { aiAnalysisConnection } from './ai-analysis.queue';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const logger = new Logger('AiAnalysisWorker');
const prisma = new PrismaClient();
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

function buildPrompt(jobTitle: string, jobSkills: string[]) {
  const today = new Date().toISOString().split('T')[0];
  return `You are a resume screening assistant. Today's date is ${today}.
Analyze the attached resume PDF against this job.

Job Title: ${jobTitle}
Required Skills: ${jobSkills.join(', ')}

Read the resume content carefully. Extract the following, calculating all durations
relative to today's date (${today}):
- Total professional work experience in years (exclude internships and education; count only full-time/part-time jobs). If the candidate has never held a full-time job, this is 0.
- Whether the candidate has done at least one internship (true/false).
- Candidate type: "fresher" (no internship, no job experience), "intern" (has internship but no full-time job experience), or "experienced" (has at least one full-time job).
- Current/most recent company name and role, if any.
- How many months the candidate has been at their current/most recent company (calculate from the stated start date to today, ${today}). If a graduation or end date mentioned is already in the past relative to today, treat it as completed, not upcoming.

Return ONLY valid JSON, no markdown:
{
  "score": <number 0-100>,
  "confidence": <number 0-100>,
  "matchedSkills": [<string>],
  "missingSkills": [<string>],
  "strengths": [<string>],
  "risks": [<string>],
  "candidateType": "fresher" | "intern" | "experienced",
  "totalExperienceYears": <number, e.g. 1.5>,
  "hasInternship": <boolean>,
  "currentCompany": <string or null>,
  "currentRole": <string or null>,
  "currentTenureMonths": <number or null>
}`;
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

    const model = gemini.getGenerativeModel({ model: process.env.GEMINI_MODEL_PRIMARY as string });
    const result = await model.generateContent([
      { text: buildPrompt(application.job.title, application.job.skills) },
      { inlineData: { mimeType: 'application/pdf', data: resumeBase64 } },
    ]);

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
    promptVersion: 'resume-analysis-v3-experience',
    score: parsed.score,
    confidence: parsed.confidence,
    matchedSkills: parsed.matchedSkills,
    missingSkills: parsed.missingSkills,
    strengths: parsed.strengths,
    risks: parsed.risks,
    reviewStatus: 'pending',
    rawResponse: parsed,
    candidateType: parsed.candidateType,
    totalExperienceYears: parsed.totalExperienceYears,
    hasInternship: parsed.hasInternship,
    currentCompany: parsed.currentCompany,
    currentRole: parsed.currentRole,
    currentTenureMonths: parsed.currentTenureMonths,
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

async function fetchResumeAsBase64(resumeUrl: string): Promise<string> {
  const response = await axios.get(resumeUrl, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
}