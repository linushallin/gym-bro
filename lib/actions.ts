"use server";

import { prisma } from "@/lib/prisma";
import { isWorkoutType } from "@/lib/workout-types";
import type { WorkoutType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SESSION_RESUME_WINDOW_MS = 6 * 60 * 60 * 1000; // reuse a session started within the last 6h

function parseNumber(value: FormDataEntryValue | null): number {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

async function resolveExercise(formData: FormData, workoutType: WorkoutType): Promise<string> {
  const existingExerciseId = formData.get("exerciseId");
  if (existingExerciseId && String(existingExerciseId).length > 0) {
    return String(existingExerciseId);
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Namn krävs");

  const exercise = await prisma.exercise.upsert({
    where: { name_workoutType: { name, workoutType } },
    update: {},
    create: { name, workoutType },
  });
  return exercise.id;
}

async function findOrCreateSession(workoutType: WorkoutType) {
  const resumeAfter = new Date(Date.now() - SESSION_RESUME_WINDOW_MS);
  const existing = await prisma.session.findFirst({
    where: { workoutType, createdAt: { gte: resumeAfter }, finishedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.session.create({ data: { workoutType } });
}

async function findOrCreateEntry(sessionId: string, exerciseId: string) {
  const existing = await prisma.sessionEntry.findFirst({ where: { sessionId, exerciseId } });
  if (existing) return existing;

  return prisma.sessionEntry.create({ data: { sessionId, exerciseId } });
}

// Start (or resume) a session for a workout type, no exercise chosen yet.
export async function startSession(formData: FormData) {
  const workoutType = String(formData.get("workoutType") ?? "");
  if (!isWorkoutType(workoutType)) throw new Error("Ogiltigt pass");

  const session = await findOrCreateSession(workoutType);
  revalidatePath("/", "layout");
  redirect(`/pass/${session.id}`);
}

// Jump straight into logging one specific exercise (e.g. from its detail page):
// resumes today's session for its workout type and adds it as an entry.
export async function startSessionForExercise(formData: FormData) {
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) throw new Error("Övningen hittades inte");

  const session = await findOrCreateSession(exercise.workoutType);
  await findOrCreateEntry(session.id, exercise.id);

  revalidatePath("/", "layout");
  redirect(`/pass/${session.id}`);
}

// Add another exercise to a session already in progress.
export async function addExerciseToSession(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Passet hittades inte");

  const exerciseId = await resolveExercise(formData, session.workoutType);
  await findOrCreateEntry(sessionId, exerciseId);

  revalidatePath("/", "layout");
}

export async function addSet(formData: FormData) {
  const sessionEntryId = String(formData.get("sessionEntryId") ?? "");
  const weight = parseNumber(formData.get("weight"));
  const reps = parseNumber(formData.get("reps"));

  if (!sessionEntryId || Number.isNaN(weight) || Number.isNaN(reps) || weight < 0 || reps <= 0) {
    throw new Error("Ogiltigt set");
  }

  await prisma.workoutSet.create({
    data: { sessionEntryId, weight, reps: Math.round(reps) },
  });

  revalidatePath("/", "layout");
}

// Explicitly close a session so a later session of the same workout type
// starts fresh instead of being merged into this one by the resume window.
export async function finishSession(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const workoutType = String(formData.get("workoutType") ?? "");
  if (!id) throw new Error("Passet hittades inte");

  await prisma.session.update({ where: { id }, data: { finishedAt: new Date() } });

  revalidatePath("/", "layout");
  redirect(`/passtyp/${workoutType.toLowerCase()}`);
}

export async function deleteSet(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.workoutSet.delete({ where: { id } });
  revalidatePath("/", "layout");
}

// Only removes an entry that has no sets yet — safety net against accidental deletes.
export async function deleteEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.sessionEntry.deleteMany({ where: { id, sets: { none: {} } } });
  revalidatePath("/", "layout");
}
