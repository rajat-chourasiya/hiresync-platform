-- Feature 1: Dynamic Role Management
-- Make Role org-scoped: add orgId (nullable), drop global unique on name,
-- add composite unique (orgId, name).

ALTER TABLE "roles" ADD COLUMN "orgId" TEXT;

-- Drop the old unique constraint on name alone
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_key";

-- Add composite unique: (orgId, name)
-- NULL orgId = system roles; NULL = NULL in Postgres so they won't clash.
CREATE UNIQUE INDEX "roles_orgId_name_key" ON "roles"("orgId", "name");

-- Index for fast org-scoped lookups
CREATE INDEX "roles_orgId_idx" ON "roles"("orgId");
