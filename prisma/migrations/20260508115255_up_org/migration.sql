/*
  Warnings:

  - You are about to drop the column `organization_id` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "organization_id";

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "website_url" TEXT NOT NULL,
    "external_links" TEXT,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
