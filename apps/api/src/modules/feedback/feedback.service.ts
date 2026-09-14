import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubmitInterviewerFeedbackDto } from '../hiring-pipeline/dto/submit-interviewer-feedback.dto';
import { STAGE1_INTERVIEWER_CRITERIA, computeWeightedScore } from '../hiring-pipeline/constants/pipeline-criteria';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async submit(orgId: string, interviewId: string, interviewerId: string, dto: SubmitInterviewerFeedbackDto) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId } });
    if (!interview) throw new NotFoundException('Interview not found');
    if (!interview.interviewerIds.includes(interviewerId)) throw new ForbiddenException('Not assigned to this interview');
    if (!interview.candidateIds.includes(dto.candidateId)) throw new BadRequestException('Candidate is not part of this interview');

    const application = await this.prisma.application.findFirst({
      where: { orgId, jobId: interview.jobId, candidateId: dto.candidateId },
    });
    if (!application) throw new NotFoundException('Matching application not found');

    const existing = await this.prisma.feedback.findFirst({ where: { interviewId, interviewerId, candidateId: dto.candidateId } });
    if (existing) throw new BadRequestException('Feedback already submitted for this candidate');

    const missingEvidence = dto.criteria.filter((c) => !c.evidence?.trim());
    if (missingEvidence.length > 0) throw new BadRequestException('Evidence is required for every criterion');

    const weightedScore = computeWeightedScore(dto.criteria, STAGE1_INTERVIEWER_CRITERIA);

    const scoresJson = {
  criteria: dto.criteria.map((criterion) => ({
    key: criterion.key,
    score: criterion.score,
    evidence: criterion.evidence,
  })),
  weightedScore,
  strengths: dto.strengths ?? null,
  weaknesses: dto.weaknesses ?? null,
  behavioralNotes: dto.behavioralNotes ?? null,
};

const feedback = await this.prisma.feedback.create({
  data: {
    interviewId,
    applicationId: application.id,
    interviewerId,
    candidateId: dto.candidateId,
    scores: scoresJson as Prisma.InputJsonValue,
    recommendation: dto.recommendation,
  },
});
    const totalExpected = interview.interviewerIds.length * interview.candidateIds.length;
    const totalSubmitted = await this.prisma.feedback.count({ where: { interviewId } });
    if (totalSubmitted >= totalExpected) {
      await this.prisma.interview.update({ where: { id: interviewId }, data: { status: 'completed' } });
    }

    return feedback;
  }

  async findByInterview(orgId: string, interviewId: string) {
    const interview = await this.prisma.interview.findFirst({ where: { id: interviewId, orgId } });
    if (!interview) throw new NotFoundException('Interview not found');
    return this.prisma.feedback.findMany({ where: { interviewId } });
  }

  async findByCandidate(
  orgId: string,
  interviewId: string,
  candidateId: string,
) {
  const interview = await this.prisma.interview.findFirst({
    where: {
      id: interviewId,
      orgId,
    },
  });

  if (!interview) {
    throw new NotFoundException('Interview not found');
  }

  if (!interview.candidateIds.includes(candidateId)) {
    throw new BadRequestException(
      'Candidate is not part of this interview',
    );
  }

  return this.prisma.feedback.findMany({
    where: {
      interviewId,
      candidateId,
    },
    orderBy: {
      submittedAt: 'desc',
    },
  });
}
}