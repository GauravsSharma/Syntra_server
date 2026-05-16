/*
  Warnings:

  - A unique constraint covering the columns `[user_email]` on the table `chatBotMetadata` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "chatBotMetadata_user_email_key" ON "chatBotMetadata"("user_email");
