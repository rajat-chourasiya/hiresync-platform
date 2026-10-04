import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { slugify } from '../../common/helpers/slugify';
import { buildJobDescriptionPrompt } from './prompts/job-description-generator.prompt';
import { GeminiService } from '../ai/providers/gemini.service';
import { JobValidationService } from './validators/job-validation.service';
import { GenerateJobDescriptionDto } from './dto/generate-job-description.dto';
import { Prisma } from '@prisma/client';

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
async generateDescription(orgId: string, jobId: string, outputSettings: GenerateJobDescriptionDto) {
  const job = await this.prisma.job.findFirst({ where: { id: jobId, orgId } });
  if (!job) throw new NotFoundException('Job not found');

  const settings = {
    platform: outputSettings.platform ?? 'job_board',
    tone: outputSettings.tone ?? 'neutral',
    targetLength: outputSettings.targetLength ?? 'standard',
    maxCharacters: outputSettings.maxCharacters,
    includeEmojis: outputSettings.tone === 'formal' ? false : (outputSettings.includeEmojis ?? false),
    includeHashtags: outputSettings.includeHashtags ?? false,
  };

  const prompt = buildJobDescriptionPrompt(job, settings);
  let raw = await this.gemini.generate(prompt);
  let parsed = this.parseGeneratedJson(raw);

  if (settings.maxCharacters) {
    const currentLength = JSON.stringify(parsed).length;
    if (currentLength > settings.maxCharacters) {
      const regenPrompt = `${prompt}\n\nThe previous output was too long. Regenerate a SHORTER version so the total content fits comfortably within ${settings.maxCharacters} characters, while preserving all essential facts and eligibility restrictions.`;
      raw = await this.gemini.generate(regenPrompt);
      parsed = this.parseGeneratedJson(raw);
    }
  }

  await this.prisma.job.update({ where: { id: jobId }, data: { generatedPost: parsed } });
  return parsed;
}

private parseGeneratedJson(raw: string): Prisma.InputJsonObject {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new BadRequestException('AI returned invalid JSON — please try generating again');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestException('AI returned invalid JSON — please try generating again');
  }

  return parsed as Prisma.InputJsonObject;
}
}