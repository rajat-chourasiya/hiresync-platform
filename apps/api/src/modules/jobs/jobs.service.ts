import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { GenerateJobDescriptionDto } from './dto/generate-job-description.dto';
import { slugify } from '../../common/helpers/slugify';
import {
  buildJobDescriptionPrompt, buildJobDescriptionEditPrompt, buildRegenerateSectionsPrompt,
} from './prompts/job-description-generator.prompt';
import { GeminiService } from '../ai/providers/gemini.service';
import { JobValidationService } from './validators/job-validation.service';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
    private jobValidationService: JobValidationService,
  ) {}

  async create(orgId: string, dto: CreateJobDto) {
    this.jobValidationService.validate(dto);
    const slug = slugify(dto.title);

    const existing = await this.prisma.job.findUnique({ where: { orgId_slug: { orgId, slug } } });
    if (existing) throw new ConflictException('A job with this title already exists');

    return this.prisma.job.create({
      data: {
        orgId, title: dto.title, slug, description: dto.description,
        roleCategory: dto.roleCategory, jobLevel: dto.jobLevel, employmentType: dto.employmentType,
        workMode: dto.workMode, location: dto.location, remoteEligibleLocations: dto.remoteEligibleLocations ?? [],
        hybridDaysPerWeek: dto.hybridDaysPerWeek, workingHours: dto.workingHours, department: dto.department,
        numOpenings: dto.numOpenings, engagementDuration: dto.engagementDuration,
        experienceRequirement: dto.experienceRequirement, minExperienceMonths: dto.minExperienceMonths,
        maxExperienceMonths: dto.maxExperienceMonths, freshersPolicy: dto.freshersPolicy,
        experiencePreferred: dto.experiencePreferred ?? false, experienceArea: dto.experienceArea,
        skills: dto.skills ?? [], requiredTechStack: dto.requiredTechStack ?? [], preferredSkills: dto.preferredSkills ?? [],
        domain: dto.domain, educationRequirement: dto.educationRequirement, requiredDegree: dto.requiredDegree,
        requiredField: dto.requiredField, keyResponsibilities: dto.keyResponsibilities,
        companyDescription: dto.companyDescription, companyStage: dto.companyStage, culturePerks: dto.culturePerks ?? [],
        whyJoin: dto.whyJoin, showSalary: dto.showSalary ?? false, salaryMin: dto.salaryMin, salaryMax: dto.salaryMax,
        salaryCurrency: dto.salaryCurrency, salaryPeriod: dto.salaryPeriod, salaryBasis: dto.salaryBasis,
        preferredStartTimeframe: dto.preferredStartTimeframe,
        preferredStartDate: dto.preferredStartDate ? new Date(dto.preferredStartDate) : undefined,
        applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : undefined,
        applicationMethod: dto.applicationMethod, applicationDestination: dto.applicationDestination,
        stages: dto.stages ?? ['screening', 'interview', 'offer'], status: 'draft',
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
    return this.prisma.job.updateMany({ where: { id, orgId }, data: { status: 'published' } });
  }

  private async getJobWithCompany(orgId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, orgId }, include: { organization: true } });
    if (!job) throw new NotFoundException('Job not found');
    return { job, companyName: job.organization.name };
  }

  private async saveVersion(orgId: string, jobId: string, content: unknown, createdBy: string) {
    const count = await this.prisma.jobDescriptionVersion.count({ where: { jobId } });
    return this.prisma.jobDescriptionVersion.create({
      data: { orgId, jobId, version: count + 1, content: content as any, createdBy },
    });
  }

  async generateDescription(orgId: string, jobId: string, outputSettings: GenerateJobDescriptionDto) {
    const { job, companyName } = await this.getJobWithCompany(orgId, jobId);

    const settings = {
      platform: outputSettings.platform ?? 'job_board',
      tone: outputSettings.tone ?? 'neutral',
      targetLength: outputSettings.targetLength ?? 'standard',
      maxCharacters: outputSettings.maxCharacters,
      includeEmojis: outputSettings.tone === 'formal' ? false : (outputSettings.includeEmojis ?? false),
      includeHashtags: outputSettings.includeHashtags ?? false,
    };

    const prompt = buildJobDescriptionPrompt(job, companyName, settings);
    let parsed = validateGeneratedPost(this.parseJson(await this.gemini.generate(prompt)));

    if (settings.maxCharacters && countVisibleCharacters(parsed) > settings.maxCharacters) {
      const regenPrompt = `${prompt}\n\nThe previous output exceeded ${settings.maxCharacters} visible characters. Regenerate a SHORTER version that fits within this limit while preserving all essential facts.`;
      parsed = validateGeneratedPost(this.parseJson(await this.gemini.generate(regenPrompt)));
    }

    if (job.generatedPost) {
      await this.saveVersion(orgId, jobId, job.generatedPost, 'system');
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: { generatedPost: parsed as any, descriptionSettings: settings as any },
    });

    return parsed;
  }

  async editDescription(orgId: string, jobId: string, userId: string, instruction: string) {
    const { job, companyName } = await this.getJobWithCompany(orgId, jobId);
    if (!job.generatedPost) throw new BadRequestException('No generated post exists yet — generate one first');

    const settings = (job.descriptionSettings as Record<string, unknown>) ?? {};
    const prompt = buildJobDescriptionEditPrompt(job.generatedPost, job, companyName, instruction, settings);
    const parsed = validateGeneratedPost(this.parseJson(await this.gemini.generate(prompt)));

    await this.saveVersion(orgId, jobId, job.generatedPost, userId);
    await this.prisma.job.update({ where: { id: jobId }, data: { generatedPost: parsed as any } });

    return parsed;
  }

  async regenerateSections(orgId: string, jobId: string, userId: string, sectionTypes: string[]) {
    const { job, companyName } = await this.getJobWithCompany(orgId, jobId);
    if (!job.generatedPost) throw new BadRequestException('No generated post exists yet — generate one first');

    const settings = (job.descriptionSettings as Record<string, unknown>) ?? {};
    const prompt = buildRegenerateSectionsPrompt(job.generatedPost, job, companyName, settings, sectionTypes);
    const parsed = validateGeneratedPost(this.parseJson(await this.gemini.generate(prompt)));

    await this.saveVersion(orgId, jobId, job.generatedPost, userId);
    await this.prisma.job.update({ where: { id: jobId }, data: { generatedPost: parsed as any } });

    return parsed;
  }

  async updateDescriptionManual(orgId: string, jobId: string, userId: string, newPost: unknown) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, orgId } });
    if (!job) throw new NotFoundException('Job not found');

    const validated = validateGeneratedPost(newPost);

    if (job.generatedPost) {
      await this.saveVersion(orgId, jobId, job.generatedPost, userId);
    }
    await this.prisma.job.update({ where: { id: jobId }, data: { generatedPost: validated as any } });

    return validated;
  }

  async listVersions(orgId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, orgId } });
    if (!job) throw new NotFoundException('Job not found');

    return this.prisma.jobDescriptionVersion.findMany({ where: { jobId }, orderBy: { version: 'desc' } });
  }

  async restoreVersion(orgId: string, jobId: string, userId: string, versionId: string) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, orgId } });
    if (!job) throw new NotFoundException('Job not found');

    const target = await this.prisma.jobDescriptionVersion.findFirst({ where: { id: versionId, jobId } });
    if (!target) throw new NotFoundException('Version not found');

    if (job.generatedPost) {
      await this.saveVersion(orgId, jobId, job.generatedPost, userId); // undo-safety — current state bhi save karo
    }

    await this.prisma.job.update({ where: { id: jobId }, data: { generatedPost: target.content as any } });
    return target.content;
  }

  private parseJson(raw: string): unknown {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new BadRequestException('AI returned invalid JSON — please try again');
    }
  }
}