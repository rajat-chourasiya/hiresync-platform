-- Add IANA timezone column to users and candidate_profiles
-- Defaults to 'Asia/Kolkata' for backward compatibility

ALTER TABLE "users" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE "candidate_profiles" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';
