/*
  Warnings:

  - You are about to drop the column `role` on the `ai_question_sets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[interviewId,candidateId]` on the table `ai_question_sets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `candidateId` to the `ai_question_sets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `interviewId` to the `ai_question_sets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ai_question_sets` table without a default value. This is not possible if the table is not empty.
  - Made the column `roundType` on table `ai_question_sets` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ai_question_sets" DROP COLUMN "role",
ADD COLUMN     "candidateId" TEXT NOT NULL,
ADD COLUMN     "interviewId" TEXT NOT NULL,
ADD COLUMN     "interviewerNote" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "roundType" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ai_question_sets_interviewId_idx" ON "ai_question_sets"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_question_sets_interviewId_candidateId_key" ON "ai_question_sets"("interviewId", "candidateId");
