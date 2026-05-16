/*
  Warnings:

  - A unique constraint covering the columns `[user_email]` on the table `Metadata` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Metadata_user_email_key" ON "Metadata"("user_email");
