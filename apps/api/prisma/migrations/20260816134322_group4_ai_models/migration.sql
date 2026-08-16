-- CreateTable
CREATE TABLE "ai_resume_analyses" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "modelProvider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "score" DECIMAL(5,2),
    "confidence" DECIMAL(5,2),
    "matchedSkills" TEXT[],
    "missingSkills" TEXT[],
    "strengths" TEXT[],
    "risks" TEXT[],
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_resume_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_question_sets" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "role" TEXT,
    "difficulty" TEXT,
    "roundType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_question_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feedback_summaries" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "riskNotes" TEXT[],
    "finalRecommendationDraft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "featureName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_resume_analyses_applicationId_key" ON "ai_resume_analyses"("applicationId");

-- CreateIndex
CREATE INDEX "ai_resume_analyses_orgId_idx" ON "ai_resume_analyses"("orgId");

-- CreateIndex
CREATE INDEX "ai_resume_analyses_applicationId_idx" ON "ai_resume_analyses"("applicationId");

-- CreateIndex
CREATE INDEX "ai_question_sets_orgId_idx" ON "ai_question_sets"("orgId");

-- CreateIndex
CREATE INDEX "ai_question_sets_jobId_idx" ON "ai_question_sets"("jobId");

-- CreateIndex
CREATE INDEX "ai_feedback_summaries_interviewId_idx" ON "ai_feedback_summaries"("interviewId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_orgId_idx" ON "ai_usage_logs"("orgId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");
