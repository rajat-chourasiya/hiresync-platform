import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApplyDto } from './dto/apply.dto';

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

    return this.prisma.application.create({
      data: {
        orgId,
        jobId: job.id,
        candidateId: candidate.id,
        status: 'applied',
        aiAnalysisStatus: 'queued',
      },
    });
  }
}