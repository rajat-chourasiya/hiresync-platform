-- Add reviewer assignment fields to ai_question_sets
-- reviewerId: User who is assigned to review/finalize the question set
-- reviewerType: 'self' (recruiter reviews) or 'interviewer' (assigned interviewer reviews)
-- reviewedAt: Timestamp when reviewer finalized the set
ALTER TABLE "ai_question_sets" ADD COLUMN "reviewerId" TEXT;
ALTER TABLE "ai_question_sets" ADD COLUMN "reviewerType" TEXT;
ALTER TABLE "ai_question_sets" ADD COLUMN "reviewedAt" TIMESTAMP(3);
-- Index for reviewer lookups (e.g. "show me all sets assigned to me")
CREATE INDEX "ai_question_sets_reviewerId_idx" ON "ai_question_sets"("reviewerId");