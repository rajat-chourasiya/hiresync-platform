import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateJobDto } from '../dto/create-job.dto';


interface Section {
  type: string;
  icon: string;
  title: string;
  content?: string;
  items?: string[];
}

export interface GeneratedPost {
  title: string;
  opening: string;
  meta: { company: string; location: string; employmentType: string; workMode: string; workingHours: string };
  sections: Section[];
  hashtags: string[];
}

export function validateGeneratedPost(data: unknown): GeneratedPost {
  if (!data || typeof data !== 'object') throw new BadRequestException('Generated post must be an object');
  const post = data as any;

  if (typeof post.title !== 'string') throw new BadRequestException('title must be a string');
  if (typeof post.opening !== 'string') throw new BadRequestException('opening must be a string');

  if (!post.meta || typeof post.meta !== 'object') throw new BadRequestException('meta must be an object');
  for (const key of ['company', 'location', 'employmentType', 'workMode', 'workingHours']) {
    if (typeof post.meta[key] !== 'string') throw new BadRequestException(`meta.${key} must be a string`);
  }

  if (!Array.isArray(post.sections)) throw new BadRequestException('sections must be an array');
  post.sections.forEach((section: any, i: number) => {
    if (!section || typeof section !== 'object') throw new BadRequestException(`sections[${i}] must be an object`);
    if (typeof section.type !== 'string') throw new BadRequestException(`sections[${i}].type must be a string`);
    if (typeof section.icon !== 'string') throw new BadRequestException(`sections[${i}].icon must be a string`);
    if (typeof section.title !== 'string') throw new BadRequestException(`sections[${i}].title must be a string`);
    const hasContent = typeof section.content === 'string';
    const hasItems = Array.isArray(section.items) && section.items.every((it: unknown) => typeof it === 'string');
    if (!hasContent && !hasItems) {
      throw new BadRequestException(`sections[${i}] must have a string "content" or a string[] "items"`);
    }
  });

  if (!Array.isArray(post.hashtags) || !post.hashtags.every((h: unknown) => typeof h === 'string')) {
    throw new BadRequestException('hashtags must be a string array');
  }

  return post as GeneratedPost;
}

export function countVisibleCharacters(post: GeneratedPost): number {
  let total = post.title.length + post.opening.length;
  for (const section of post.sections) {
    total += section.title.length;
    if (section.content) total += section.content.length;
    if (section.items) total += section.items.join(' ').length;
  }
  total += post.hashtags.join(' ').length;
  return total;
}

@Injectable()
export class JobValidationService {
  validate(dto: CreateJobDto) {
    // Rule: range max >= min
    if (dto.experienceRequirement === 'range' && dto.maxExperienceMonths! < dto.minExperienceMonths!) {
      throw new BadRequestException('maxExperienceMonths must be >= minExperienceMonths');
    }

    // Rule: minimum must be > 0
    if (dto.experienceRequirement === 'minimum' && (!dto.minExperienceMonths || dto.minExperienceMonths <= 0)) {
      throw new BadRequestException('minExperienceMonths must be greater than zero for "minimum" requirement');
    }

    // Rule: welcome/only cannot coexist with positive minimum
    if (['welcome', 'only'].includes(dto.freshersPolicy ?? '') && (dto.minExperienceMonths ?? 0) > 0) {
      throw new BadRequestException('freshersPolicy "welcome"/"only" cannot coexist with a positive minExperienceMonths');
    }

    // Rule: only -> experiencePreferred must be false
    if (dto.freshersPolicy === 'only' && dto.experiencePreferred) {
      throw new BadRequestException('experiencePreferred must be false when freshersPolicy is "only"');
    }

    // Rule: not_eligible requires positive minimum
    if (dto.freshersPolicy === 'not_eligible' && (dto.experienceRequirement === 'not_required' || !dto.minExperienceMonths)) {
      throw new BadRequestException('freshersPolicy "not_eligible" requires a positive minExperienceMonths');
    }

    // Rule: salary_max >= salary_min
    if (dto.showSalary && dto.salaryMin != null && dto.salaryMax != null && dto.salaryMax < dto.salaryMin) {
      throw new BadRequestException('salaryMax must be >= salaryMin');
    }

    // Rule: showSalary requires currency + period
    if (dto.showSalary && (!dto.salaryCurrency || !dto.salaryPeriod)) {
      throw new BadRequestException('salaryCurrency and salaryPeriod are required when showSalary is true');
    }

    // Rule: expired deadline rejected
    if (dto.applicationDeadline && new Date(dto.applicationDeadline) < new Date()) {
      throw new BadRequestException('applicationDeadline cannot be in the past');
    }

    // Rule: dedupe skills, flag mandatory+preferred overlap
    const mustHave = new Set(dto.skills ?? []);
    const preferred = new Set(dto.preferredSkills ?? []);
    const overlap = [...mustHave].filter((s) => preferred.has(s));
    if (overlap.length > 0) {
      throw new BadRequestException(`Skills cannot be both must-have and preferred: ${overlap.join(', ')}`);
    }

    // Rule: at least 1 key responsibility
    if (!dto.keyResponsibilities || dto.keyResponsibilities.length === 0) {
      throw new BadRequestException('At least one key responsibility is required');
    }
  }

  
}

