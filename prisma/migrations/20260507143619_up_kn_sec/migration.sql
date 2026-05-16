/*
  Warnings:

  - You are about to drop the column `source_ids` on the `sections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sections" DROP COLUMN "source_ids";

-- CreateTable
CREATE TABLE "_KnowledgeSourceToSection" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_KnowledgeSourceToSection_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_KnowledgeSourceToSection_B_index" ON "_KnowledgeSourceToSection"("B");

-- AddForeignKey
ALTER TABLE "_KnowledgeSourceToSection" ADD CONSTRAINT "_KnowledgeSourceToSection_A_fkey" FOREIGN KEY ("A") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KnowledgeSourceToSection" ADD CONSTRAINT "_KnowledgeSourceToSection_B_fkey" FOREIGN KEY ("B") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
