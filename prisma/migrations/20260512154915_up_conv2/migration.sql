/*
  Warnings:

  - Added the required column `org_id` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ConversationStatus" ADD VALUE 'EXPIRE';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "org_id" TEXT NOT NULL;
