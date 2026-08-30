-- CreateIndex
CREATE INDEX "applications_orgId_idx" ON "applications"("orgId");

-- AddForeignKey
ALTER TABLE "ai_resume_analyses" ADD CONSTRAINT "ai_resume_analyses_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
