import { PrismaClient } from '@prisma/client';

export type InterviewLike = {
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  interviewerIds: string[];
  candidateIds: string[];
};

export const INTERVIEW_ACTIVE_STATUSES = ['scheduled', 'in_progress', 'awaiting_feedback'];


export const APPLICATION_INTERVIEW_STATUSES = [
  'interview_scheduled',
  'interview_in_progress',
  'feedback_pending',
  'interview_completed',
];

const APPLICATION_STATUS_FOR: Record<string, string> = {
  scheduled: 'interview_scheduled',
  in_progress: 'interview_in_progress',
  awaiting_feedback: 'feedback_pending',
  completed: 'interview_completed',
  cancelled: 'shortlisted',
};

export const expectedFeedbackCount = (i: Pick<InterviewLike, 'interviewerIds' | 'candidateIds'>) =>
  i.interviewerIds.length * i.candidateIds.length;

export function deriveInterviewStatus(i: InterviewLike, feedbackSubmitted: number, now = new Date()): string {
  if (i.status === 'cancelled') return 'cancelled';
  if (i.status === 'completed') return 'completed';

  const expected = expectedFeedbackCount(i);
  if (expected > 0 && feedbackSubmitted >= expected) return 'completed';

  if (now < i.scheduledStart) return 'scheduled';
  if (now <= i.scheduledEnd) return 'in_progress';
  return 'awaiting_feedback';
}

// Interview ka status theek karta hai aur uske candidates ke Application statuses ko usse match karta hai
export async function syncInterviewLifecycle(prisma: PrismaClient, interviewId: string) {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) return null;

  const submitted = await prisma.feedback.count({ where: { interviewId } });
  const next = deriveInterviewStatus(interview, submitted);

  let changed = false;
  if (next !== interview.status) {
    await prisma.interview.update({ where: { id: interviewId }, data: { status: next } });
    changed = true;
  }

  const applicationStatus = APPLICATION_STATUS_FOR[next];
  if (applicationStatus) {
    await prisma.application.updateMany({
      where: {
        orgId: interview.orgId,
        jobId: interview.jobId,
        candidateId: { in: interview.candidateIds },
        status: { in: APPLICATION_INTERVIEW_STATUSES.filter((s) => s !== applicationStatus) },
      },
      data: { status: applicationStatus },
    });
  }

  return { status: next, changed };
}