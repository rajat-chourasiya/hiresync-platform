-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "descriptionSettings" JSONB;

-- CreateTable
CREATE TABLE "job_description_versions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_description_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_description_versions_jobId_idx" ON "job_description_versions"("jobId");
