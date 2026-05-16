/*
  Warnings:

  - The values [EXPIRE] on the enum `ConversationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConversationStatus_new" AS ENUM ('OPEN', 'ESCALATED', 'ACTIVE', 'RESOLVED', 'EXPIRED');
ALTER TABLE "public"."Conversation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN "status" TYPE "ConversationStatus_new" USING ("status"::text::"ConversationStatus_new");
ALTER TYPE "ConversationStatus" RENAME TO "ConversationStatus_old";
ALTER TYPE "ConversationStatus_new" RENAME TO "ConversationStatus";
DROP TYPE "public"."ConversationStatus_old";
ALTER TABLE "Conversation" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "client_email" TEXT,
ADD COLUMN     "escalation_count" INTEGER NOT NULL DEFAULT 0;
