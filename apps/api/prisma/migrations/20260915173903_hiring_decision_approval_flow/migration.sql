-- AlterTable
ALTER TABLE "hiring_decisions" ADD COLUMN     "approvalNote" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
