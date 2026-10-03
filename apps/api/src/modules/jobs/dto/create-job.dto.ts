import {
  IsString, IsArray, IsOptional, IsIn, IsInt, Min, IsBoolean,
  IsDateString, MinLength, ValidateIf,
} from 'class-validator';

export class CreateJobDto {
  @IsString() @MinLength(3) title!: string;

  @IsIn(['frontend', 'backend', 'fullstack', 'ui_ux', 'ai_engineer', 'tester_qa', 'data_engineer', 'devops', 'other'])
  @IsOptional()
  roleCategory?: string;

  @IsIn(['intern', 'fresher', 'junior', 'mid', 'senior', 'lead', 'staff', 'principal', 'manager'])
  @IsOptional()
  jobLevel?: string;

  @IsIn(['full_time', 'part_time', 'contract', 'internship'])
  employmentType!: string;

  @IsIn(['remote', 'hybrid', 'onsite'])
  workMode!: string;

  @ValidateIf((o) => o.workMode !== 'remote')
  @IsString()
  location?: string;

  @IsArray() @IsOptional() remoteEligibleLocations?: string[];
  @IsInt() @Min(1) @IsOptional() hybridDaysPerWeek?: number;
  @IsString() @IsOptional() workingHours?: string;
  @IsString() @IsOptional() department?: string;
  @IsInt() @Min(1) @IsOptional() numOpenings?: number;
  @IsString() @IsOptional() engagementDuration?: string;

  @IsIn(['not_required', 'range', 'minimum'])
  experienceRequirement!: string;

  @ValidateIf((o) => o.experienceRequirement !== 'not_required')
  @IsInt() @Min(0)
  minExperienceMonths?: number;

  @ValidateIf((o) => o.experienceRequirement === 'range')
  @IsInt()
  maxExperienceMonths?: number;

  @IsIn(['welcome', 'only', 'not_eligible', 'unspecified'])
  @IsOptional()
  freshersPolicy?: string;

  @IsBoolean() @IsOptional() experiencePreferred?: boolean;
  @IsString() @IsOptional() experienceArea?: string;

  @IsArray() @IsOptional() skills?: string[]; // mustHaveSkills
  @IsArray() @IsOptional() requiredTechStack?: string[];
  @IsArray() @IsOptional() preferredSkills?: string[];
  @IsString() @IsOptional() domain?: string;

  @IsIn(['not_required', 'any_bachelors', 'specific_degree', 'specific_degree_and_field', 'degree_or_equivalent_experience'])
  @IsOptional()
  educationRequirement?: string;

  @IsString() @IsOptional() requiredDegree?: string;
  @IsString() @IsOptional() requiredField?: string;

  @IsArray() keyResponsibilities!: string[];

  @IsString() @IsOptional() companyDescription?: string;
  @IsIn(['startup', 'established', 'other']) @IsOptional() companyStage?: string;
  @IsArray() @IsOptional() culturePerks?: string[];
  @IsString() @IsOptional() whyJoin?: string;

  @IsBoolean() @IsOptional() showSalary?: boolean;
  @IsOptional() salaryMin?: number;
  @IsOptional() salaryMax?: number;
  @IsString() @IsOptional() salaryCurrency?: string;
  @IsIn(['hour', 'month', 'year']) @IsOptional() salaryPeriod?: string;
  @IsIn(['base', 'total_compensation', 'ctc']) @IsOptional() salaryBasis?: string;

  @IsIn(['immediate', 'within_30_days', 'within_60_days', 'flexible', 'specific_date'])
  @IsOptional()
  preferredStartTimeframe?: string;

  @ValidateIf((o) => o.preferredStartTimeframe === 'specific_date')
  @IsDateString()
  preferredStartDate?: string;

  @IsDateString() @IsOptional() applicationDeadline?: string;

  @IsIn(['url', 'email', 'linkedin_dm'])
  applicationMethod!: string;

  @IsString()
  applicationDestination!: string;

  @IsArray() @IsOptional() stages?: string[];

  @IsString() @IsOptional() description?: string;
}