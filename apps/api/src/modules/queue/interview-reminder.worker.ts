/**
 * Interview Reminder Sweep Worker
 *
 * Runs every 5 minutes via BullMQ repeatable job.
 * For every upcoming / in-progress interview it checks 4 reminder windows
 * and sends each type exactly once per recipient (idempotency via
 * InterviewReminder table unique constraint).
 *
 * Reminder types:
 *   questions_not_reviewed  — question set exists but still 'draft', sent to reviewer
 *   one_day_before          — 20–26 h window before scheduledStart (candidates + interviewers)
 *   day_of                  — 2–8 h window before scheduledStart   (candidates + interviewers)
 *   one_hour_before         — 15–75 min window before scheduledStart (candidates + interviewers)
 */

import { Queue, Worker } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import * as crypto from 'crypto';
import { aiAnalysisConnection } from './ai-analysis.queue';
import {
  questionsNotReviewedTemplate,
  oneDayBeforeTemplate,
  dayOfTemplate,
  oneHourBeforeTemplate,
} from '../email/templates/interview-reminder.template';

const logger = new Logger('InterviewReminderWorker');
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY as string);
const FROM = process.env.EMAIL_FROM as string;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  await resend.emails.send({ from: FROM, to, subject, html });
  logger.log(`📧 Reminder sent to ${to} | ${subject}`);
}

/** Returns true if this reminder was freshly logged (not sent before), false if already sent. */
async function logAndGuard(
  interviewId: string,
  recipientId: string,
  recipientType: string,
  reminderType: string,
): Promise<boolean> {
  try {
    await prisma.interviewReminder.create({
      data: {
        id: crypto.randomUUID(),
        interviewId,
        recipientId,
        recipientType,
        reminderType,
      },
    });
    return true; // freshly created → go ahead and send
  } catch {
    // unique constraint violation → already sent before → skip
    return false;
  }
}

/** Generates the candidate magic-link join URL (re-creates token every sweep; expiry 48 h) */
function signToken(payload: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function getCandidateJoinUrl(interviewId: string, candidateId: string): Promise<string> {
  const secret = process.env.INTERVIEW_TOKEN_SECRET as string;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const payload = `${interviewId}:${candidateId}:${expiresAt.getTime()}`;
  const rawToken = signToken(payload, secret);
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Upsert: revoke old, insert new
  await prisma.interviewAccessToken.updateMany({
    where: { interviewId, candidateId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.interviewAccessToken.create({
    data: { interviewId, candidateId, tokenHash, expiresAt },
  });

  return `${process.env.APP_URL}/interview/join/candidate?token=${rawToken}&interviewId=${interviewId}&candidateId=${candidateId}&expires=${expiresAt.getTime()}`;
}

function getStaffJoinUrl(interviewId: string, interviewerId: string): string {
  const secret = process.env.INTERVIEW_TOKEN_SECRET as string;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const payload = `staff:${interviewId}:${interviewerId}:${expiresAt.getTime()}`;
  const rawToken = signToken(payload, secret);
  return `${process.env.APP_URL}/interview/join/staff?token=${rawToken}&interviewId=${interviewId}&interviewerId=${interviewerId}&expires=${expiresAt.getTime()}`;
}

function getQuestionsReviewUrl(interviewId: string, interviewerId: string, candidateId: string): string {
  const secret = process.env.INTERVIEW_TOKEN_SECRET as string;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const payload = `staff:${interviewId}:${interviewerId}:${expiresAt.getTime()}`;
  const rawToken = signToken(payload, secret);
  return `${process.env.APP_URL}/interview/questions/review?token=${rawToken}&interviewId=${interviewId}&interviewerId=${interviewerId}&candidateId=${candidateId}&expires=${expiresAt.getTime()}`;
}

// ─── Sweep logic ──────────────────────────────────────────────────────────────

async function runSweep() {
  const now = new Date();

  // Fetch all upcoming / in-progress interviews (not completed/cancelled)
  const interviews = await prisma.interview.findMany({
    where: {
      status: { notIn: ['completed', 'cancelled'] },
      scheduledStart: { gt: new Date(now.getTime() - 2 * 60 * 60 * 1000) }, // started at most 2h ago
    },
    select: {
      id: true, orgId: true, jobId: true,
      scheduledStart: true, scheduledEnd: true,
      candidateIds: true, interviewerIds: true,
    },
  });

  logger.log(`Reminder sweep: checking ${interviews.length} interview(s)`);

  for (const interview of interviews) {
    const msUntilStart = interview.scheduledStart.getTime() - now.getTime();
    const hoursUntil   = msUntilStart / (1000 * 60 * 60);

    // Fetch supporting data once per interview
    const [job, candidates, interviewers, questionSets] = await Promise.all([
      prisma.job.findUnique({ where: { id: interview.jobId }, select: { title: true } }),
      prisma.candidateProfile.findMany({
        where: { id: { in: interview.candidateIds } },
        select: { id: true, name: true, email: true, timezone: true },
      }),
      prisma.user.findMany({
        where: { id: { in: interview.interviewerIds } },
        select: { id: true, name: true, email: true, timezone: true },
      }),
      prisma.aiGeneratedQuestionSet.findMany({
        where: { interviewId: interview.id },
        select: { candidateId: true, reviewerId: true, status: true },
      }),
    ]);

    if (!job) continue;

    const candidateNames = candidates.map((c) => c.name).join(', ');

    // ── 1. Questions not reviewed ───────────────────────────────────────────
    // Window: interview is within the next 24 hours and question set is still 'draft'
    if (hoursUntil > 0 && hoursUntil <= 24) {
      for (const qs of questionSets) {
        if (qs.status !== 'draft' || !qs.reviewerId) continue;

        const reviewer = interviewers.find((u) => u.id === qs.reviewerId);
        if (!reviewer) continue;

        const ok = await logAndGuard(interview.id, reviewer.id, 'staff', 'questions_not_reviewed');
        if (!ok) continue;

        const candidateName = candidates.find((c) => c.id === qs.candidateId)?.name ?? 'Candidate';
        const reviewUrl = getQuestionsReviewUrl(interview.id, reviewer.id, qs.candidateId);
        const { subject, html } = questionsNotReviewedTemplate(
          reviewer.name ?? reviewer.email,
          job.title,
          candidateName,
          interview.scheduledStart,
          reviewUrl,
          reviewer.timezone,
        );
        await sendEmail(reviewer.email, subject, html).catch((e: Error) =>
          logger.error(`Failed questions_not_reviewed email to ${reviewer.email}: ${e.message}`),
        );
      }
    }

    // ── 2. One day before (20–26 h window) ─────────────────────────────────
    if (hoursUntil >= 20 && hoursUntil < 26) {
      // Candidates
      for (const candidate of candidates) {
        const ok = await logAndGuard(interview.id, candidate.id, 'candidate', 'one_day_before');
        if (!ok) continue;
        const joinUrl = await getCandidateJoinUrl(interview.id, candidate.id).catch(() => process.env.APP_URL as string);
        const { subject, html } = oneDayBeforeTemplate(
          candidate.name, job.title, interview.scheduledStart, joinUrl, 'candidate', undefined, candidate.timezone,
        );
        await sendEmail(candidate.email, subject, html).catch((e: Error) =>
          logger.error(`Failed one_day_before email to ${candidate.email}: ${e.message}`),
        );
      }
      // Interviewers
      for (const interviewer of interviewers) {
        const ok = await logAndGuard(interview.id, interviewer.id, 'staff', 'one_day_before');
        if (!ok) continue;
        const joinUrl = getStaffJoinUrl(interview.id, interviewer.id);
        const { subject, html } = oneDayBeforeTemplate(
          interviewer.name ?? interviewer.email, job.title,
          interview.scheduledStart, joinUrl, 'staff', candidateNames, interviewer.timezone,
        );
        await sendEmail(interviewer.email, subject, html).catch((e: Error) =>
          logger.error(`Failed one_day_before email to ${interviewer.email}: ${e.message}`),
        );
      }
    }

    // ── 3. Day-of (2–8 h window) ───────────────────────────────────────────
    if (hoursUntil >= 2 && hoursUntil < 8) {
      for (const candidate of candidates) {
        const ok = await logAndGuard(interview.id, candidate.id, 'candidate', 'day_of');
        if (!ok) continue;
        const joinUrl = await getCandidateJoinUrl(interview.id, candidate.id).catch(() => process.env.APP_URL as string);
        const { subject, html } = dayOfTemplate(
          candidate.name, job.title, interview.scheduledStart, joinUrl, 'candidate', undefined, candidate.timezone,
        );
        await sendEmail(candidate.email, subject, html).catch((e: Error) =>
          logger.error(`Failed day_of email to ${candidate.email}: ${e.message}`),
        );
      }
      for (const interviewer of interviewers) {
        const ok = await logAndGuard(interview.id, interviewer.id, 'staff', 'day_of');
        if (!ok) continue;
        const joinUrl = getStaffJoinUrl(interview.id, interviewer.id);
        const { subject, html } = dayOfTemplate(
          interviewer.name ?? interviewer.email, job.title,
          interview.scheduledStart, joinUrl, 'staff', candidateNames, interviewer.timezone,
        );
        await sendEmail(interviewer.email, subject, html).catch((e: Error) =>
          logger.error(`Failed day_of email to ${interviewer.email}: ${e.message}`),
        );
      }
    }

    // ── 4. One hour before (15–75 min window) ─────────────────────────────
    if (hoursUntil >= 0.25 && hoursUntil < 1.25) {
      for (const candidate of candidates) {
        const ok = await logAndGuard(interview.id, candidate.id, 'candidate', 'one_hour_before');
        if (!ok) continue;
        const joinUrl = await getCandidateJoinUrl(interview.id, candidate.id).catch(() => process.env.APP_URL as string);
        const { subject, html } = oneHourBeforeTemplate(
          candidate.name, job.title, interview.scheduledStart, joinUrl, 'candidate', undefined, candidate.timezone,
        );
        await sendEmail(candidate.email, subject, html).catch((e: Error) =>
          logger.error(`Failed one_hour_before email to ${candidate.email}: ${e.message}`),
        );
      }
      for (const interviewer of interviewers) {
        const ok = await logAndGuard(interview.id, interviewer.id, 'staff', 'one_hour_before');
        if (!ok) continue;
        const joinUrl = getStaffJoinUrl(interview.id, interviewer.id);
        const { subject, html } = oneHourBeforeTemplate(
          interviewer.name ?? interviewer.email, job.title,
          interview.scheduledStart, joinUrl, 'staff', candidateNames, interviewer.timezone,
        );
        await sendEmail(interviewer.email, subject, html).catch((e: Error) =>
          logger.error(`Failed one_hour_before email to ${interviewer.email}: ${e.message}`),
        );
      }
    }
  }
}

// ─── BullMQ queue + worker + 5-min scheduler ──────────────────────────────────

export const interviewReminderQueue = new Queue('interview-reminder', {
  connection: aiAnalysisConnection,
});

export const interviewReminderWorker = new Worker(
  'interview-reminder',
  async () => {
    try {
      await runSweep();
    } catch (err: unknown) {
      logger.error(`Reminder sweep failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
  { connection: aiAnalysisConnection, concurrency: 1 },
);

// Every 5 minutes
interviewReminderQueue
  .upsertJobScheduler(
    'reminder-sweep',
    { every: 5 * 60 * 1000 },
    {
      name: 'reminder-sweep',
      data: {},
      opts: { removeOnComplete: true, removeOnFail: 20 },
    },
  )
  .catch((err: Error) =>
    logger.error(`Could not schedule reminder sweep: ${err.message}`),
  );
