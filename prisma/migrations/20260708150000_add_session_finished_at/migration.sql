-- AlterTable: sessions can be explicitly finished so a later session of the
-- same workout type doesn't get merged into it by the resume-window logic.
ALTER TABLE "Session" ADD COLUMN "finishedAt" TIMESTAMP(3);
