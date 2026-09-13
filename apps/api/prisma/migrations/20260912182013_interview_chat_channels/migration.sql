/*
  Warnings:

  - Added the required column `channel` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ChatChannel" AS ENUM ('CANDIDATE', 'INTERVIEWER');

-- DropIndex
DROP INDEX "chat_messages_roomId_createdAt_idx";

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "channel" "ChatChannel" NOT NULL;

-- CreateIndex
CREATE INDEX "chat_messages_roomId_channel_createdAt_idx" ON "chat_messages"("roomId", "channel", "createdAt");
