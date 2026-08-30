-- AlterTable
ALTER TABLE "ai_resume_analyses" ADD COLUMN     "candidateType" TEXT,
ADD COLUMN     "currentCompany" TEXT,
ADD COLUMN     "currentRole" TEXT,
ADD COLUMN     "currentTenureMonths" INTEGER,
ADD COLUMN     "hasInternship" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalExperienceYears" DECIMAL(4,1);
