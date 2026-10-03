import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { slugify } from '../../common/helpers/slugify';
import { buildJobDescriptionPrompt } from './prompts/job-description-generator.prompt';
import { GeminiService } from '../ai/providers/gemini.service';
import { JobValidationService } from './validators/job-validation.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService, private gemini: GeminiService, private jobValidationService: JobValidationService) {}

async create(orgId: string, dto: CreateJobDto) {
  this.jobValidationService.validate(dto);
  const slug = slugify(dto.title);

  const existing = await this.prisma.job.findUnique({ where: { orgId_slug: { orgId, slug } } });
  if (existing) throw new ConflictException('A job with this title already exists');

  return this.prisma.job.create({
    data: {
      orgId,
      title: dto.title,
      slug,
      description: dto.description,
      roleCategory: dto.roleCategory,
      jobLevel: dto.jobLevel,
      employmentType: dto.employmentType,
      workMode: dto.workMode,
      location: dto.location,
      remoteEligibleLocations: dto.remoteEligibleLocations ?? [],
      hybridDaysPerWeek: dto.hybridDaysPerWeek,
      workingHours: dto.workingHours,
      department: dto.department,
      numOpenings: dto.numOpenings,
      engagementDuration: dto.engagementDuration,
      experienceRequirement: dto.experienceRequirement,
      minExperienceMonths: dto.minExperienceMonths,
      maxExperienceMonths: dto.maxExperienceMonths,
      freshersPolicy: dto.freshersPolicy,
      experiencePreferred: dto.experiencePreferred ?? false,
      experienceArea: dto.experienceArea,
      skills: dto.skills ?? [],
      requiredTechStack: dto.requiredTechStack ?? [],
      preferredSkills: dto.preferredSkills ?? [],
      domain: dto.domain,
      educationRequirement: dto.educationRequirement,
      requiredDegree: dto.requiredDegree,
      requiredField: dto.requiredField,
      keyResponsibilities: dto.keyResponsibilities,
      companyDescription: dto.companyDescription,
      companyStage: dto.companyStage,
      culturePerks: dto.culturePerks ?? [],
      whyJoin: dto.whyJoin,
      showSalary: dto.showSalary ?? false,
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      salaryCurrency: dto.salaryCurrency,
      salaryPeriod: dto.salaryPeriod,
      salaryBasis: dto.salaryBasis,
      preferredStartTimeframe: dto.preferredStartTimeframe,
      preferredStartDate: dto.preferredStartDate ? new Date(dto.preferredStartDate) : undefined,
      applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : undefined,
      applicationMethod: dto.applicationMethod,
      applicationDestination: dto.applicationDestination,
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

  async generateDescription(orgId: string, jobId: string, outputSettings: {
  tone?: string; targetLength?: string; maxCharacters?: number;
  includeEmojis?: boolean; includeHashtags?: boolean;
}) {
  const job = await this.prisma.job.findFirst({ where: { id: jobId, orgId } });
  if (!job) throw new NotFoundException('Job not found');

  const settings = {
    tone: outputSettings.tone ?? 'neutral',
    targetLength: outputSettings.targetLength ?? 'standard',
    maxCharacters: outputSettings.maxCharacters,
    includeEmojis: outputSettings.tone === 'formal' ? false : (outputSettings.includeEmojis ?? false),
    includeHashtags: outputSettings.includeHashtags ?? false,
  };

  const prompt = buildJobDescriptionPrompt(job, settings);
  let generated = await this.gemini.generate(prompt);

  if (settings.maxCharacters && generated.length > settings.maxCharacters) {
    const regenPrompt = `${prompt}\n\nThe previous output exceeded ${settings.maxCharacters} characters. Regenerate a SHORTER version that fits within ${settings.maxCharacters} characters while preserving all essential facts and eligibility restrictions.`;
    generated = await this.gemini.generate(regenPrompt);
  }

  await this.prisma.job.update({ where: { id: jobId }, data: { description: generated } });
  return { description: generated };
}
}