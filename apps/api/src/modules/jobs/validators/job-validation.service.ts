import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateJobDto } from '../dto/create-job.dto';

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