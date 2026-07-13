/*
  Warnings:

  - You are about to drop the column `notes` on the `SessionEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SessionEntry" DROP COLUMN "notes";

-- CreateTable
CREATE TABLE "BodyWeight" (
    "id" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyWeight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BodyWeight_createdAt_idx" ON "BodyWeight"("createdAt");
