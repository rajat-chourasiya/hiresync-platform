/*
  Warnings:

  - You are about to drop the column `candidateType` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `confidence` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `currentCompany` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `currentRole` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `currentTenureMonths` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `hasInternship` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `matchedSkills` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `missingSkills` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `rawResponse` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `risks` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `strengths` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - You are about to drop the column `totalExperienceYears` on the `ai_resume_analyses` table. All the data in the column will be lost.
  - Added the required column `fullAnalysis` to the `ai_resume_analyses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ai_resume_analyses" DROP COLUMN "candidateType",
DROP COLUMN "confidence",
DROP COLUMN "currentCompany",
DROP COLUMN "currentRole",
DROP COLUMN "currentTenureMonths",
DROP COLUMN "hasInternship",
DROP COLUMN "matchedSkills",
DROP COLUMN "missingSkills",
DROP COLUMN "rawResponse",
DROP COLUMN "risks",
DROP COLUMN "score",
DROP COLUMN "strengths",
DROP COLUMN "totalExperienceYears",
ADD COLUMN     "candidateLevel" TEXT,
ADD COLUMN     "experienceMode" TEXT,
ADD COLUMN     "fullAnalysis" JSONB NOT NULL,
ADD COLUMN     "matchScore" DECIMAL(5,2),
ADD COLUMN     "relevantExperienceMonths" INTEGER,
ADD COLUMN     "roleCategory" TEXT,
ADD COLUMN     "tier" TEXT,
ADD COLUMN     "totalExperienceMonths" INTEGER;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "description" TEXT;
