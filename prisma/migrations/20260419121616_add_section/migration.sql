/*
  Warnings:

  - The `meta_data` column on the `KnowledgeSource` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "KnowledgeSource" DROP COLUMN "meta_data",
ADD COLUMN     "meta_data" JSONB;

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source_ids" TEXT[],
    "tone" TEXT NOT NULL,
    "allowed_topics" TEXT,
    "blocked_topics" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);
