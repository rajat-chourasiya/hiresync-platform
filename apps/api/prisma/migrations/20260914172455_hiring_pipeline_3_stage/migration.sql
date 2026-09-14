/*
  Warnings:

  - Added the required column `applicationId` to the `feedbacks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `candidateId` to the `feedbacks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN     "applicationId" TEXT NOT NULL,
ADD COLUMN     "candidateId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "recruiter_evaluations" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "weightedScore" DECIMAL(3,2) NOT NULL,
    "noticePeriod" TEXT NOT NULL,
    "salaryFit" TEXT NOT NULL,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_evaluations" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "weightedScore" DECIMAL(3,2) NOT NULL,
    "riskNotes" TEXT,
    "riskSeverity" TEXT,
    "recommendation" TEXT,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_decisions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "interviewScore" DECIMAL(3,2),
    "recruiterScore" DECIMAL(3,2),
    "preManagerScore" DECIMAL(3,2),
    "gatePassed" BOOLEAN,
    "managerScore" DECIMAL(3,2),
    "finalScore" DECIMAL(3,2),
    "tier" TEXT,
    "overriddenTier" TEXT,
    "overrideReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hiring_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_logs" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "computedTier" TEXT NOT NULL,
    "overriddenTier" TEXT NOT NULL,
    "overrideReason" TEXT NOT NULL,
    "overriddenBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_evaluations_applicationId_key" ON "recruiter_evaluations"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "manager_evaluations_applicationId_key" ON "manager_evaluations"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_decisions_applicationId_key" ON "hiring_decisions"("applicationId");

-- CreateIndex
CREATE INDEX "calibration_logs_applicationId_idx" ON "calibration_logs"("applicationId");

-- CreateIndex
CREATE INDEX "feedbacks_applicationId_idx" ON "feedbacks"("applicationId");
