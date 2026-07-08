-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('SHOULDERS', 'BACK_BICEPS', 'CHEST_TRICEPS', 'LEGS', 'ABS', 'ARMS', 'BACK_CHEST', 'SHOULDERS_ARMS');

-- Cardio has no equivalent split day in the new model; none have logged sets, safe to drop
DELETE FROM "Exercise" WHERE "muscleGroup" = 'CARDIO';

-- AlterTable: add workoutType, backfill from the old muscleGroup (triceps/biceps names split out of ARMS
-- to match how this user already pairs them: chest+triceps, back+biceps)
ALTER TABLE "Exercise" ADD COLUMN "workoutType" "WorkoutType";

UPDATE "Exercise" SET "workoutType" = (CASE
  WHEN "muscleGroup" = 'CHEST' THEN 'CHEST_TRICEPS'
  WHEN "muscleGroup" = 'BACK' THEN 'BACK_BICEPS'
  WHEN "muscleGroup" = 'LEGS' THEN 'LEGS'
  WHEN "muscleGroup" = 'SHOULDERS' THEN 'SHOULDERS'
  WHEN "muscleGroup" = 'CORE' THEN 'ABS'
  WHEN "muscleGroup" = 'ARMS' AND (name ILIKE '%triceps%' OR name ILIKE '%fransk%' OR name ILIKE '%pushdown%') THEN 'CHEST_TRICEPS'
  WHEN "muscleGroup" = 'ARMS' THEN 'BACK_BICEPS'
END)::"WorkoutType";

ALTER TABLE "Exercise" ALTER COLUMN "workoutType" SET NOT NULL;

-- Drop old column, index and enum
DROP INDEX "Exercise_name_muscleGroup_key";
ALTER TABLE "Exercise" DROP COLUMN "muscleGroup";
DROP TYPE "MuscleGroup";

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_workoutType_key" ON "Exercise"("name", "workoutType");
