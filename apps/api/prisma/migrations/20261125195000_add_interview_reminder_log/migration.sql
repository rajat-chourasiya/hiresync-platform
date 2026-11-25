-- Add InterviewReminder table for idempotent reminder tracking
-- reminderType: 'questions_not_reviewed' | 'one_day_before' | 'day_of' | 'one_hour_before'

CREATE TABLE "interview_reminders" (
    "id"            TEXT NOT NULL,
    "interviewId"   TEXT NOT NULL,
    "recipientId"   TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "reminderType"  TEXT NOT NULL,
    "sentAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "interview_reminders_interviewId_recipientId_reminderType_key"
    ON "interview_reminders"("interviewId", "recipientId", "reminderType");

CREATE INDEX "interview_reminders_interviewId_idx"
    ON "interview_reminders"("interviewId");
