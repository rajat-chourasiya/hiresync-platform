/*
  Warnings:

  - You are about to drop the column `candidateId` on the `interviews` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "interviews" DROP COLUMN "candidateId",
ADD COLUMN     "candidateIds" TEXT[],
ADD COLUMN     "interviewType" TEXT NOT NULL DEFAULT 'single_candidate';
