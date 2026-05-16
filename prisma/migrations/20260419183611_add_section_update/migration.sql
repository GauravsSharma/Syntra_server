/*
  Warnings:

  - The `allowed_topics` column on the `sections` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `blocked_topics` column on the `sections` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "sections" DROP COLUMN "allowed_topics",
ADD COLUMN     "allowed_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "blocked_topics",
ADD COLUMN     "blocked_topics" TEXT[] DEFAULT ARRAY[]::TEXT[];
