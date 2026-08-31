import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApplyDto } from './dto/apply.dto';
import { aiAnalysisQueue } from '../queue/ai-analysis.queue';

const CANDIDATE_TYPE_WEIGHT: Record<string, number> = {
  fresher: 1,
  intern: 2,
  experienced: 3,
};

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) { }

  async apply(orgId: string, jobSlug: string, dto: ApplyDto) {
    const job = await this.prisma.job.findUnique({
      where: { orgId_slug: { orgId, slug: jobSlug } },
    });
    if (!job || job.status !== 'published') {
      throw new NotFoundException('Job not found or not accepting applications');
    }

    const expectedDomain = `res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
    if (!dto.resumeUrl.includes(expectedDomain)) {
      throw new BadRequestException('Invalid resume URL');
    }

    let candidate = await this.prisma.candidateProfile.findFirst({
      where: { orgId, email: dto.email },
    });
    if (!candidate) {
      candidate = await this.prisma.candidateProfile.create({
        data: {
          orgId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          skills: dto.skills ?? [],
          resumeUrl: dto.resumeUrl,
        },
      });
    } else {
      candidate = await this.prisma.candidateProfile.update({
        where: { id: candidate.id },
        data: {
          name: dto.name,
          phone: dto.phone,
          skills: dto.skills ?? [],
          resumeUrl: dto.resumeUrl,
        },
      });
    }

    const existingApp = await this.prisma.application.findUnique({
      where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } },
    });
    if (existingApp) throw new ConflictException('You have already applied to this job');

    const application = await this.prisma.application.create({
      data: {
        orgId,
        jobId: job.id,
        candidateId: candidate.id,
        status: 'applied',
        aiAnalysisStatus: 'queued',
      },
    });

    await aiAnalysisQueue.add('analyze', { applicationId: application.id });

    return application;
  }

  async listByJob(orgId: string, jobId: string) {
    return this.prisma.application.findMany({
      where: { orgId, jobId },
      include: {
        candidate: true,
        aiResumeAnalysis: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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

      // 1. Primary: AI score (higher first)
      const scoreDiff = this.toNumber(aiB.score) - this.toNumber(aiA.score);
      if (scoreDiff !== 0) return scoreDiff;

      // 2. Tie-break: candidate type hierarchy (experienced > intern > fresher)
      const typeDiff =
        (CANDIDATE_TYPE_WEIGHT[aiB.candidateType ?? 'fresher'] ?? 0) -
        (CANDIDATE_TYPE_WEIGHT[aiA.candidateType ?? 'fresher'] ?? 0);
      if (typeDiff !== 0) return typeDiff;

      // 3. Tie-break: years of experience (higher first)
      const expDiff = this.toNumber(aiB.totalExperienceYears) - this.toNumber(aiA.totalExperienceYears);
      if (expDiff !== 0) return expDiff;

      // 4. Final tie-break: AI confidence (higher first)
      return this.toNumber(aiB.confidence) - this.toNumber(aiA.confidence);
    });
  }

  private toNumber(val: unknown): number {
    return val ? Number(val) : 0;
  }
}