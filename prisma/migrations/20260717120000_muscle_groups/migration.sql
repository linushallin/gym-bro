-- Free-form muscle groups: exercises get a single atomic MuscleGroup, sessions get
-- an array of them. Reverses the old combined-WorkoutType model and, crucially,
-- merges exercises that were duplicated across day-types into one row so their
-- logged history is unified.

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'LEGS', 'ABS');

-- AlterTable: split each exercise's combined workoutType into a single muscle group,
-- using name heuristics for the paired types (same approach as 20260708130000_workout_types).
ALTER TABLE "Exercise" ADD COLUMN "muscleGroup" "MuscleGroup";

UPDATE "Exercise" SET "muscleGroup" = (CASE
  WHEN "workoutType" = 'SHOULDERS' THEN 'SHOULDERS'
  WHEN "workoutType" = 'LEGS' THEN 'LEGS'
  WHEN "workoutType" = 'ABS' THEN 'ABS'
  WHEN "workoutType" = 'CHEST_TRICEPS' THEN
    CASE WHEN name ILIKE '%triceps%' OR name ILIKE '%fransk%' OR name ILIKE '%pushdown%' OR name ILIKE '%dips%'
      THEN 'TRICEPS' ELSE 'CHEST' END
  WHEN "workoutType" = 'BACK_BICEPS' THEN
    CASE WHEN name ILIKE '%curl%' THEN 'BICEPS' ELSE 'BACK' END
  WHEN "workoutType" = 'ARMS' THEN
    CASE WHEN name ILIKE '%triceps%' OR name ILIKE '%fransk%' OR name ILIKE '%pushdown%' OR name ILIKE '%dips%'
      THEN 'TRICEPS' ELSE 'BICEPS' END
  WHEN "workoutType" = 'BACK_CHEST' THEN
    CASE WHEN name ILIKE '%bänk%' OR name ILIKE '%press%' OR name ILIKE '%fly%' OR name ILIKE '%dips%'
      OR name ILIKE '%smith%' OR name ILIKE '%incline%' OR name ILIKE '%chest%' OR name ILIKE '%bröst%'
      THEN 'CHEST' ELSE 'BACK' END
  WHEN "workoutType" = 'SHOULDERS_ARMS' THEN
    CASE
      WHEN name ILIKE '%curl%' THEN 'BICEPS'
      WHEN name ILIKE '%triceps%' OR name ILIKE '%fransk%' OR name ILIKE '%pushdown%' OR name ILIKE '%dips%' THEN 'TRICEPS'
      ELSE 'SHOULDERS' END
END)::"MuscleGroup";

-- Merge exercises that now share (name, muscleGroup): keep the earliest as canonical,
-- repoint every entry of the duplicates to it, then drop the duplicate rows. This is
-- what unifies the history of an exercise done across different day-types.
CREATE TEMP TABLE "_exercise_merge" AS
SELECT id,
  first_value(id) OVER (
    PARTITION BY name, "muscleGroup" ORDER BY "createdAt" ASC, id ASC
  ) AS canonical_id
FROM "Exercise";

UPDATE "SessionEntry" se
SET "exerciseId" = m.canonical_id
FROM "_exercise_merge" m
WHERE se."exerciseId" = m.id AND m.id <> m.canonical_id;

DELETE FROM "Exercise" e
USING "_exercise_merge" m
WHERE e.id = m.id AND m.id <> m.canonical_id;

DROP TABLE "_exercise_merge";

-- Lock in the new column and unique key, drop the old ones.
ALTER TABLE "Exercise" ALTER COLUMN "muscleGroup" SET NOT NULL;
DROP INDEX "Exercise_name_workoutType_key";
ALTER TABLE "Exercise" DROP COLUMN "workoutType";
CREATE UNIQUE INDEX "Exercise_name_muscleGroup_key" ON "Exercise"("name", "muscleGroup");

-- AlterTable: expand each session's single workoutType into an array of muscle groups.
ALTER TABLE "Session" ADD COLUMN "muscleGroups" "MuscleGroup"[] NOT NULL DEFAULT ARRAY[]::"MuscleGroup"[];

UPDATE "Session" SET "muscleGroups" = (CASE
  WHEN "workoutType" = 'SHOULDERS'      THEN ARRAY['SHOULDERS']
  WHEN "workoutType" = 'LEGS'           THEN ARRAY['LEGS']
  WHEN "workoutType" = 'ABS'            THEN ARRAY['ABS']
  WHEN "workoutType" = 'CHEST_TRICEPS'  THEN ARRAY['CHEST', 'TRICEPS']
  WHEN "workoutType" = 'BACK_BICEPS'    THEN ARRAY['BACK', 'BICEPS']
  WHEN "workoutType" = 'ARMS'           THEN ARRAY['BICEPS', 'TRICEPS']
  WHEN "workoutType" = 'BACK_CHEST'     THEN ARRAY['BACK', 'CHEST']
  WHEN "workoutType" = 'SHOULDERS_ARMS' THEN ARRAY['SHOULDERS', 'BICEPS', 'TRICEPS']
END)::"MuscleGroup"[];

DROP INDEX "Session_workoutType_createdAt_idx";
ALTER TABLE "Session" DROP COLUMN "workoutType";
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");

-- The default was only needed to add the column to existing rows; the model has none.
ALTER TABLE "Session" ALTER COLUMN "muscleGroups" DROP DEFAULT;

-- DropEnum
DROP TYPE "WorkoutType";
