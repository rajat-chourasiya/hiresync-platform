-- Add roundType to interviews table
-- Allows recruiter to specify the round type when scheduling an interview
-- Question generation automatically inherits this roundType unless overridden

ALTER TABLE "interviews" ADD COLUMN "roundType" TEXT NOT NULL DEFAULT 'technical_interview';
