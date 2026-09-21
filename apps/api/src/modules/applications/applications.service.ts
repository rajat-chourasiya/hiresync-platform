import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApplyDto } from './dto/apply.dto';
import { aiAnalysisQueue } from '../queue/ai-analysis.queue';
import { ReviewApplicationDto } from './dto/review-application.dto';


const LEVEL_WEIGHT: Record<string, number> = {
  FRESHER: 0, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5, L6: 6,
};

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) { }

  async apply(orgId: string, jobSlug: string, dto: ApplyDto) {
  const job = await this.prisma.job.findUnique({ where: { orgId_slug: { orgId, slug: jobSlug } } });
  if (!job || job.status !== 'published') {
    throw new NotFoundException('Job not found or not accepting applications');
  }

  const expectedDomain = `res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
  if (!dto.resumeUrl.includes(expectedDomain)) {
    throw new BadRequestException('Invalid resume URL');
  }

  const duplicateResume = await this.prisma.candidateProfile.findFirst({
    where: { orgId, resumeHash: dto.resumeHash, email: { not: dto.email } },
  });

  let candidate = await this.prisma.candidateProfile.findFirst({ where: { orgId, email: dto.email } });
  if (!candidate) {
    candidate = await this.prisma.candidateProfile.create({
      data: {
        orgId, name: dto.name, email: dto.email, phone: dto.phone,
        skills: dto.skills ?? [], resumeUrl: dto.resumeUrl, resumeHash: dto.resumeHash,
      },
    });
  } else {
    candidate = await this.prisma.candidateProfile.update({
      where: { id: candidate.id },
      data: { name: dto.name, phone: dto.phone, skills: dto.skills ?? [], resumeUrl: dto.resumeUrl, resumeHash: dto.resumeHash },
    });
  }

  const existingApp = await this.prisma.application.findUnique({
    where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } },
  });
  if (existingApp) throw new ConflictException('You have already applied to this job');

  const initialStatus = duplicateResume ? 'suspicious_duplicate' : 'applied';
  const initialAiStatus = duplicateResume ? 'on_hold' : 'queued';

  const application = await this.prisma.application.create({
    data: { orgId, jobId: job.id, candidateId: candidate.id, status: initialStatus, aiAnalysisStatus: initialAiStatus },
  });

  if (duplicateResume) {
    await this.prisma.auditLog.create({
      data: {
        orgId,
        action: 'candidate.duplicate_resume_flagged',
        resourceType: 'Application',
        resourceId: application.id,
        metadata: { newEmail: dto.email, matchedCandidateId: duplicateResume.id, resumeHash: dto.resumeHash },
      },
    });
  } else {
    await aiAnalysisQueue.add('analyze', { applicationId: application.id });
    // await this.emailService.sendApplicationConfirmation(dto.email, dto.name, job.title);
  }

  return application;
}

async releaseSuspiciousApplication(orgId: string, applicationId: string, decision: 'proceed' | 'reject') {
  const application = await this.prisma.application.findFirst({ where: { id: applicationId, orgId } });
  if (!application) throw new NotFoundException('Application not found');

  if (application.status !== 'suspicious_duplicate') {
    throw new BadRequestException('This application is not flagged as suspicious');
  }

  if (decision === 'proceed') {
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: 'applied', aiAnalysisStatus: 'queued' },
    });
    await aiAnalysisQueue.add('analyze', { applicationId });

    const candidate = await this.prisma.candidateProfile.findUnique({ where: { id: application.candidateId } });
    const job = await this.prisma.job.findUnique({ where: { id: application.jobId } });
    if (candidate && job) {
      // await this.emailService.sendApplicationConfirmation(candidate.email, candidate.name, job.title);
    }
    return updated;
  } else {
    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status: 'rejected' },
    });
  }
}

  async listSuspicious(orgId: string) {
  return this.prisma.application.findMany({
    where: { orgId, status: 'suspicious_duplicate' },
    include: { candidate: true, job: true },
    orderBy: { createdAt: 'desc' },
  });
}

  async listByJob(orgId: string, jobId: string) {
  console.log('Service received orgId:', orgId, 'jobId:', jobId);
  const result = await this.prisma.application.findMany({
    where: { orgId, jobId },
    include: { candidate: true, aiResumeAnalysis: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Result count:', result.length);
  return result;
}

  async findOne(orgId: string, id: string) {
    return this.prisma.application.findFirst({
      where: { id, orgId },
      include: {
        candidate: true,
        job: true,
        aiResumeAnalysis: true,
      },
    });
  }


async listByJobRanked(orgId: string, jobId: string) {
  const applications = await this.prisma.application.findMany({
    where: { orgId, jobId },
    include: { candidate: true, aiResumeAnalysis: true },
  });

  return applications.sort((a, b) => {
    const aiA = a.aiResumeAnalysis;
    const aiB = b.aiResumeAnalysis;
    if (!aiA || !aiB) return 0;

    // 1. Primary: matchScore (higher first)
    const scoreDiff = this.toNumber(aiB.matchScore) - this.toNumber(aiA.matchScore);
    if (scoreDiff !== 0) return scoreDiff;

    // 2. Tie-break: candidate level hierarchy (FRESHER < L1 < ... < L6)
    const levelDiff =
      (LEVEL_WEIGHT[aiB.candidateLevel ?? 'FRESHER'] ?? 0) -
      (LEVEL_WEIGHT[aiA.candidateLevel ?? 'FRESHER'] ?? 0);
    if (levelDiff !== 0) return levelDiff;

    // 3. Final tie-break: relevant experience months (higher first)
    return (aiB.relevantExperienceMonths ?? 0) - (aiA.relevantExperienceMonths ?? 0);
  });
}

private toNumber(val: unknown): number {
  return val ? Number(val) : 0;
}


async review(orgId: string, applicationId: string, dto: ReviewApplicationDto) {
  const application = await this.prisma.application.findFirst({
    where: { id: applicationId, orgId },
  });
  if (!application) throw new NotFoundException('Application not found');

  const updated = await this.prisma.application.update({
    where: { id: applicationId },
    data: { status: dto.status },
  });

  if (application.orgId) {
    await this.prisma.aiResumeAnalysis.updateMany({
      where: { applicationId },
      data: { reviewStatus: 'reviewed' },
    });
  }

  await this.prisma.auditLog.create({
    data: {
      orgId,
      action: 'application.review',
      resourceType: 'Application',
      resourceId: applicationId,
      metadata: { newStatus: dto.status, reviewNote: dto.reviewNote ?? null },
    },
  });

  return updated;
}
}