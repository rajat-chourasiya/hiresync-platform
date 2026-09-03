import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { slugify } from '../../common/helpers/slugify';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateJobDto) {
  const slug = slugify(dto.title);

  const existing = await this.prisma.job.findUnique({
    where: { orgId_slug: { orgId, slug } },
  });
  if (existing) throw new ConflictException('A job with this title already exists');

  return this.prisma.job.create({
    data: {
      orgId,
      title: dto.title,
      description: dto.description,
      slug,
      skills: dto.skills ?? [],
      stages: dto.stages ?? ['screening', 'interview', 'offer'],
      status: 'draft',
    },
  });
}

  async findAll(orgId: string) {
    return this.prisma.job.findMany({ where: { orgId }, orderBy: { createdAt: 'desc' } });
  }

  async findBySlug(orgId: string, slug: string) {
    return this.prisma.job.findUnique({ where: { orgId_slug: { orgId, slug } } });
  }

  async publish(orgId: string, id: string) {
    return this.prisma.job.updateMany({
      where: { id, orgId },
      data: { status: 'published' },
    });
  }
}