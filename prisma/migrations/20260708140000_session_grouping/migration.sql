-- Rename WorkoutLog -> SessionEntry (ids preserved, so WorkoutSet's FK values stay valid)
ALTER TABLE "WorkoutLog" RENAME TO "SessionEntry";
ALTER TABLE "SessionEntry" RENAME CONSTRAINT "WorkoutLog_pkey" TO "SessionEntry_pkey";
ALTER TABLE "SessionEntry" RENAME CONSTRAINT "WorkoutLog_exerciseId_fkey" TO "SessionEntry_exerciseId_fkey";
ALTER INDEX "WorkoutLog_exerciseId_createdAt_idx" RENAME TO "SessionEntry_exerciseId_createdAt_idx";

-- CreateTable: one Session per existing SessionEntry (each becomes the sole entry
-- in its own session — later sessions can hold many entries going forward)
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "workoutType" "WorkoutType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "legacyEntryId" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Session" (id, "workoutType", "createdAt", "legacyEntryId")
SELECT gen_random_uuid()::text, e."workoutType", se."createdAt", se.id
FROM "SessionEntry" se
JOIN "Exercise" e ON e.id = se."exerciseId";

-- AlterTable: link SessionEntry to its new Session
ALTER TABLE "SessionEntry" ADD COLUMN "sessionId" TEXT;
UPDATE "SessionEntry" se SET "sessionId" = s.id FROM "Session" s WHERE s."legacyEntryId" = se.id;
ALTER TABLE "SessionEntry" ALTER COLUMN "sessionId" SET NOT NULL;

ALTER TABLE "Session" DROP COLUMN "legacyEntryId";

-- AddForeignKey
ALTER TABLE "SessionEntry" ADD CONSTRAINT "SessionEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SessionEntry_sessionId_idx" ON "SessionEntry"("sessionId");
CREATE INDEX "Session_workoutType_createdAt_idx" ON "Session"("workoutType", "createdAt");

-- AlterTable: WorkoutSet now points at SessionEntry (values unchanged, column renamed)
ALTER TABLE "WorkoutSet" RENAME COLUMN "workoutLogId" TO "sessionEntryId";
ALTER TABLE "WorkoutSet" RENAME CONSTRAINT "WorkoutSet_workoutLogId_fkey" TO "WorkoutSet_sessionEntryId_fkey";
ALTER INDEX "WorkoutSet_workoutLogId_idx" RENAME TO "WorkoutSet_sessionEntryId_idx";
