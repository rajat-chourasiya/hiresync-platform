import { PrismaService } from '../../database/prisma.service';

export type InterviewLike = {
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  interviewerIds: string[];
  candidateIds: string[];
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

export async function syncCompletedStatus(prisma: PrismaService, interviewId: string) {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview || interview.status === 'cancelled' || interview.status === 'completed') return;

  const expected = expectedFeedbackCount(interview);
  const submitted = await prisma.feedback.count({ where: { interviewId } });
  if (expected > 0 && submitted >= expected) {
    await prisma.interview.update({ where: { id: interviewId }, data: { status: 'completed' } });
  }
}