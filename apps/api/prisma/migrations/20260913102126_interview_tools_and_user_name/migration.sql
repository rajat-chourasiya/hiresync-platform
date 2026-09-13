-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "enabledTools" TEXT[] DEFAULT ARRAY['chat', 'video']::TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "name" TEXT;
