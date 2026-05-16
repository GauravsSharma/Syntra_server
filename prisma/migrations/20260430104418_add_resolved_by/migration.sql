-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'ESCALATED', 'RESOLVED');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "escalated_at" TIMESTAMP(3),
ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "resolved_by" TEXT,
ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN';
