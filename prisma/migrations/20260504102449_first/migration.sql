/*
  Warnings:

  - Added the required column `organization_id` to the `chatBotMetadata` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ConversationStatus" ADD VALUE 'ACTIVE';

-- AlterTable
ALTER TABLE "chatBotMetadata" ADD COLUMN     "organization_id" TEXT NOT NULL;
