// Shared domain enums used across multiple modules

export enum Role {
  ORG_ADMIN = 'org_admin',
  RECRUITER = 'recruiter',
  INTERVIEWER = 'interviewer',
  HIRING_MANAGER = 'hiring_manager',
  CANDIDATE = 'candidate',
}

export enum ApplicationStatus {
  APPLIED = 'applied',
  SCREENING = 'screening',
  ASSESSMENT = 'assessment',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export enum AiAnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum QuestionSetStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
}

export enum PaymentStatus {
  PENDING = 'pending',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
