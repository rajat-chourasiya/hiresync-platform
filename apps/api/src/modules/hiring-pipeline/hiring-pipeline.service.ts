import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubmitRecruiterEvaluationDto } from './dto/submit-recruiter-evaluation.dto';
import { SubmitManagerEvaluationDto } from './dto/submit-manager-evaluation.dto';
import { Prisma } from '@prisma/client';

import {
  STAGE2_RECRUITER_CRITERIA, getStage3ManagerCriteria,
  computeWeightedScore, mapTier,
} from './constants/pipeline-criteria';
import { ApproveHireDto } from './dto/approve-hire.dto';
import { EmailService } from '../email/email.service';

const GATE_THRESHOLD = 3.2;

@Injectable()
export class HiringPipelineService {
  constructor(private prisma: PrismaService, private emailService: EmailService) {}



  private async recomputeInterviewScore(applicationId: string) {
    const feedbacks = await this.prisma.feedback.findMany({ where: { applicationId } });
    if (feedbacks.length === 0) return null;
    const avg = feedbacks.reduce((sum, f: any) => sum + (f.scores?.weightedScore ?? 0), 0) / feedbacks.length;
    return Math.round(avg * 100) / 100;
  }

  private async tryGate(applicationId: string) {
    const interviewScore = await this.recomputeInterviewScore(applicationId);
    const recruiterEval = await this.prisma.recruiterEvaluation.findUnique({ where: { applicationId } });

    if (interviewScore === null || !recruiterEval) return; 

    const preManagerScore = Math.round(
      (interviewScore * 0.55 + Number(recruiterEval.weightedScore) * 0.45) * 100,
    ) / 100;
    const gatePassed = preManagerScore >= GATE_THRESHOLD;

    await this.prisma.hiringDecision.upsert({
      where: { applicationId },
      create: { applicationId, interviewScore, recruiterScore: recruiterEval.weightedScore, preManagerScore, gatePassed },
      update: { interviewScore, recruiterScore: recruiterEval.weightedScore, preManagerScore, gatePassed },
    });

    if (!gatePassed) {
      await this.prisma.application.update({ where: { id: applicationId }, data: { status: 'on_hold' } });
    }
  }

  async submitRecruiterEvaluation(orgId: string, applicationId: string, recruiterId: string, dto: SubmitRecruiterEvaluationDto) {
    const application = await this.prisma.application.findFirst({ where: { id: applicationId, orgId } });
    if (!application) throw new NotFoundException('Application not found');

    const existing = await this.prisma.recruiterEvaluation.findUnique({ where: { applicationId } });
    if (existing) throw new BadRequestException('Recruiter evaluation already submitted');

    const missingEvidence = dto.criteria.filter((c) => !c.evidence?.trim());
    if (missingEvidence.length > 0) throw new BadRequestException('Evidence is required for every criterion');

    const weightedScore = computeWeightedScore(dto.criteria, STAGE2_RECRUITER_CRITERIA);

    const criteriaJson = dto.criteria.map((criterion) => ({
  key: criterion.key,
  score: criterion.score,
  evidence: criterion.evidence,
}));

const evaluation = await this.prisma.recruiterEvaluation.create({
  data: {
    applicationId,
    recruiterId,
    criteria: criteriaJson as Prisma.InputJsonValue,
    weightedScore,
    noticePeriod: dto.noticePeriod,
    salaryFit: dto.salaryFit,
    recommendation: dto.recommendation,
  },
});

    await this.tryGate(applicationId);
    return evaluation;
  }

  

  async submitOrUpdateManagerEvaluation(orgId: string, applicationId: string, managerId: string, dto: SubmitManagerEvaluationDto) {
    const application = await this.prisma.application.findFirst({ where: { id: applicationId, orgId } });
    if (!application) throw new NotFoundException('Application not found');

    const decision = await this.prisma.hiringDecision.findUnique({ where: { applicationId } });
    if (!decision || !decision.gatePassed) {
      throw new ForbiddenException('Candidate has not passed the pre-manager gate');
    }
    if (decision.status === 'approved') {
      throw new ForbiddenException('This hiring decision has already been approved and can no longer be edited');
    }

    const definitions = getStage3ManagerCriteria(dto.isLeadershipRole);
    const missingEvidence = dto.criteria.filter((c) => !c.evidence?.trim());
    if (missingEvidence.length > 0) throw new BadRequestException('Evidence is required for every criterion');

    const weightedScore = computeWeightedScore(dto.criteria, definitions);
    const finalScore = Math.round((Number(decision.interviewScore) * 0.35 + Number(decision.recruiterScore) * 0.25 + weightedScore * 0.40) * 100) / 100;
    const computedTier = mapTier(finalScore);

    if (dto.recommendation && dto.recommendation !== computedTier && !dto.overrideReason) {
      throw new BadRequestException('overrideReason is mandatory when overriding the computed tier');
    }

    const existing = await this.prisma.managerEvaluation.findUnique({ where: { applicationId } });

    const criteriaJson = dto.criteria.map((criterion) => ({
    key: criterion.key,
    score: criterion.score,
    evidence: criterion.evidence,
  }));

 const evaluation = existing
      ? await this.prisma.managerEvaluation.update({
          where: { applicationId },
  data: {
    applicationId,
    managerId,
    criteria: criteriaJson as Prisma.InputJsonValue,
    weightedScore,
    riskNotes: dto.riskNotes,
    riskSeverity: dto.riskSeverity,
    recommendation: dto.recommendation,
    overrideReason: dto.overrideReason,
  },
}): await this.prisma.managerEvaluation.create({
          data: {
            applicationId, managerId, criteria: criteriaJson as Prisma.InputJsonValue, weightedScore,
            riskNotes: dto.riskNotes, riskSeverity: dto.riskSeverity,
            recommendation: dto.recommendation, overrideReason: dto.overrideReason,
          },
        });

    if (dto.overrideReason && dto.recommendation && dto.recommendation !== computedTier) {
      await this.prisma.calibrationLog.create({
        data: { applicationId, computedTier, overriddenTier: dto.recommendation, overrideReason: dto.overrideReason, overriddenBy: managerId },
      });
    }

    await this.prisma.hiringDecision.update({
      where: { applicationId },
      data: {
        managerScore: weightedScore, finalScore, tier: computedTier,
        overriddenTier: dto.recommendation && dto.recommendation !== computedTier ? dto.recommendation : null,
        overrideReason: dto.overrideReason ?? null,
        status: 'ready',
      },
    });
    return evaluation;
  }

  async approveHire(orgId: string, applicationId: string, approverId: string, dto: ApproveHireDto) {
    
    if (!applicationId || typeof applicationId !== 'string' || applicationId.trim().length === 0) {
    throw new BadRequestException('applicationId is required');
  }
    const application = await this.prisma.application.findFirst({ where: { id: applicationId, orgId } });
    if (!application) throw new NotFoundException('Application not found');

    const decision = await this.prisma.hiringDecision.findUnique({ where: { applicationId } });
    
    if (!decision || decision.status !== 'ready') {
      throw new BadRequestException('Hiring decision is not ready for approval — manager evaluation must be completed first');
    }
    

    if (dto.action === 'approve') {
      await this.prisma.hiringDecision.update({
        where: { applicationId },
        data: { status: 'approved', approvedBy: approverId, approvedAt: new Date(), approvalNote: dto.note },
      });
      await this.prisma.application.update({ where: { id: applicationId }, data: { status: 'hired' } });
    } else {
      await this.prisma.hiringDecision.update({
        where: { applicationId },
        data: { status: 'rejected', approvedBy: approverId, approvedAt: new Date(), approvalNote: dto.note },
      });
      await this.prisma.application.update({ where: { id: applicationId }, data: { status: 'rejected' } });
    }

    const candidate = await this.prisma.candidateProfile.findUnique({ where: { id: application.candidateId } });
    const job = await this.prisma.job.findUnique({ where: { id: application.jobId } });
    await this.emailService.sendOfferDecision(candidate!.email, candidate!.name, job!.title, dto.action === 'approve' ? 'hired' : 'rejected');


    return this.prisma.hiringDecision.findUnique({ where: { applicationId } });
  }

 

  async getDecision(orgId: string, applicationId: string) {
    const application = await this.prisma.application.findFirst({ where: { id: applicationId, orgId } });
    if (!application) throw new NotFoundException('Application not found');
    return this.prisma.hiringDecision.findUnique({ where: { applicationId } });
  }
}