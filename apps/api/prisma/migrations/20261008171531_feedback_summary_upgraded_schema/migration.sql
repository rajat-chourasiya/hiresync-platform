/*
  Warnings:

  - You are about to drop the column `finalRecommendationDraft` on the `ai_feedback_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `interviewerMap` on the `ai_feedback_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `riskNotes` on the `ai_feedback_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `strengths` on the `ai_feedback_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `ai_feedback_summaries` table. All the data in the column will be lost.
  - You are about to drop the column `weaknesses` on the `ai_feedback_summaries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_feedback_summaries" DROP COLUMN "finalRecommendationDraft",
DROP COLUMN "interviewerMap",
DROP COLUMN "riskNotes",
DROP COLUMN "strengths",
DROP COLUMN "summary",
DROP COLUMN "weaknesses";
