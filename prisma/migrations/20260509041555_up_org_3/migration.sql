/*
  Warnings:

  - You are about to drop the `Widget` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `org_id` to the `KnowledgeSource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `org_id` to the `sections` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KnowledgeSource" ADD COLUMN     "org_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "org_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "Widget";
