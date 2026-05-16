/*
  Warnings:

  - A unique constraint covering the columns `[user_email,organization_id]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_user_email_organization_id_key" ON "TeamMember"("user_email", "organization_id");
