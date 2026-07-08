-- Remove test/junk entries before restructuring
DELETE FROM "WorkoutSet" WHERE "workoutId" IN (SELECT id FROM "Workout" WHERE exercise IN ('Teat', 'ddd'));
DELETE FROM "Workout" WHERE exercise IN ('Teat', 'ddd');

-- Normalize whitespace so "Incline bröst maskin " and "Incline bröst maskin" collapse to one exercise
UPDATE "Workout" SET exercise = trim(exercise);

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'CARDIO');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_muscleGroup_key" ON "Exercise"("name", "muscleGroup");

-- Backfill Exercise catalog from the distinct exercise names already logged
INSERT INTO "Exercise" (id, name, "muscleGroup", "createdAt")
SELECT gen_random_uuid()::text, name, mg::"MuscleGroup", now()
FROM (
    SELECT DISTINCT exercise AS name,
        CASE exercise
            WHEN 'Incline bröst maskin' THEN 'CHEST'
            WHEN 'Bröstpress rak' THEN 'CHEST'
            WHEN 'Kablar bröst' THEN 'CHEST'
            WHEN 'Rep triceps' THEN 'ARMS'
            WHEN 'Triceps kryss' THEN 'ARMS'
            WHEN 'Rodd maskin' THEN 'BACK'
            WHEN 'Rodd smith' THEN 'BACK'
            ELSE 'CHEST'
        END AS mg
    FROM "Workout"
) sub;

-- Rename Workout -> WorkoutLog (a logged instance of performing an Exercise)
ALTER TABLE "Workout" RENAME TO "WorkoutLog";
ALTER TABLE "WorkoutLog" RENAME CONSTRAINT "Workout_pkey" TO "WorkoutLog_pkey";

-- AlterTable: link WorkoutLog to Exercise
ALTER TABLE "WorkoutLog" ADD COLUMN "exerciseId" TEXT;
UPDATE "WorkoutLog" wl SET "exerciseId" = e.id FROM "Exercise" e WHERE e.name = wl.exercise;
ALTER TABLE "WorkoutLog" ALTER COLUMN "exerciseId" SET NOT NULL;
ALTER TABLE "WorkoutLog" DROP COLUMN "exercise";
ALTER TABLE "WorkoutLog" ADD COLUMN "notes" TEXT;

-- AddForeignKey
ALTER TABLE "WorkoutLog" ADD CONSTRAINT "WorkoutLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "WorkoutLog_exerciseId_createdAt_idx" ON "WorkoutLog"("exerciseId", "createdAt");

-- AlterTable: WorkoutSet now points at WorkoutLog, weight becomes fractional (e.g. 62.5kg plates)
ALTER TABLE "WorkoutSet" DROP CONSTRAINT "WorkoutSet_workoutId_fkey";
ALTER TABLE "WorkoutSet" RENAME COLUMN "workoutId" TO "workoutLogId";
ALTER TABLE "WorkoutSet" ALTER COLUMN "weight" TYPE DOUBLE PRECISION USING "weight"::double precision;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "WorkoutSet_workoutLogId_idx" ON "WorkoutSet"("workoutLogId");
