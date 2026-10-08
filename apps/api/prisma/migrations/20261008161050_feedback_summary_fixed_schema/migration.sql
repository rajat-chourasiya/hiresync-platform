-- AlterTable
ALTER TABLE "ai_feedback_summaries" ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "averageScore" DECIMAL(3,2),
ADD COLUMN     "confidence" TEXT,
ADD COLUMN     "decisionConfidence" INTEGER,
ADD COLUMN     "interviewerMap" JSONB,
ADD COLUMN     "recommendation" TEXT;

-- CreateIndex
CREATE INDEX "ai_feedback_summaries_candidateId_idx" ON "ai_feedback_summaries"("candidateId");
