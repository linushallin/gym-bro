-- Accounts: every Exercise, Session and BodyWeight now belongs to a Supabase
-- Auth user. Data logged before accounts existed has no owner, so it is wiped
-- (deleting Session/Exercise cascades to SessionEntry and WorkoutSet).
DELETE FROM "Session";
DELETE FROM "Exercise";
DELETE FROM "BodyWeight";

-- DropIndex
DROP INDEX "Exercise_name_muscleGroup_key";
DROP INDEX "Session_createdAt_idx";
DROP INDEX "BodyWeight_createdAt_idx";

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "userId" UUID NOT NULL;
ALTER TABLE "Session" ADD COLUMN "userId" UUID NOT NULL;
ALTER TABLE "BodyWeight" ADD COLUMN "userId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_userId_muscleGroup_name_key" ON "Exercise"("userId", "muscleGroup", "name");
CREATE INDEX "Session_userId_createdAt_idx" ON "Session"("userId", "createdAt");
CREATE INDEX "BodyWeight_userId_createdAt_idx" ON "BodyWeight"("userId", "createdAt");

-- Supabase exposes the public schema over its REST API to anyone holding the
-- (intentionally public) publishable/anon key. The app only talks to these
-- tables through Prisma as the table owner, which bypasses RLS, so enabling
-- RLS with no policies locks the REST API out without affecting the app.
ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BodyWeight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
