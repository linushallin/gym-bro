"use server";

import { prisma } from "@/lib/prisma";
import { isMuscleGroup, sortGroups } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@prisma/client";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { GYM_DATA_TAG } from "@/lib/queries";

const SESSION_RESUME_WINDOW_MS = 6 * 60 * 60 * 1000; // reuse a session started within the last 6h

function parseNumber(value: FormDataEntryValue | null): number {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

async function resolveExercise(formData: FormData, muscleGroup: MuscleGroup): Promise<string> {
  const existingExerciseId = formData.get("exerciseId");
  if (existingExerciseId && String(existingExerciseId).length > 0) {
    return String(existingExerciseId);
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Namn krävs");

  const exercise = await prisma.exercise.upsert({
    where: { name_muscleGroup: { name, muscleGroup } },
    update: {},
    create: { name, muscleGroup },
  });
  return exercise.id;
}

// Resume an unfinished session started within the window that covers exactly the same
// set of muscle groups; otherwise start a fresh one. Groups are stored sorted so the
// equality match is stable regardless of the order they were picked in.
async function findOrCreateSession(groups: MuscleGroup[]) {
  const muscleGroups = sortGroups(groups);
  const resumeAfter = new Date(Date.now() - SESSION_RESUME_WINDOW_MS);
  const existing = await prisma.session.findFirst({
    where: { muscleGroups: { equals: muscleGroups }, createdAt: { gte: resumeAfter }, finishedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.session.create({ data: { muscleGroups } });
}

// Resume/create a session that trains a single muscle group — used when jumping
// straight into one exercise. Reuses any recent unfinished session that includes it.
async function findOrCreateSessionForGroup(group: MuscleGroup) {
  const resumeAfter = new Date(Date.now() - SESSION_RESUME_WINDOW_MS);
  const existing = await prisma.session.findFirst({
    where: { muscleGroups: { has: group }, createdAt: { gte: resumeAfter }, finishedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.session.create({ data: { muscleGroups: [group] } });
}

async function findOrCreateEntry(sessionId: string, exerciseId: string) {
  const existing = await prisma.sessionEntry.findFirst({ where: { sessionId, exerciseId } });
  if (existing) return existing;

  return prisma.sessionEntry.create({ data: { sessionId, exerciseId } });
}

// Start (or resume) a session for one or more chosen muscle groups, no exercise yet.
export async function startSession(formData: FormData) {
  const groups = formData.getAll("muscleGroups").map(String).filter(isMuscleGroup);
  if (groups.length === 0) throw new Error("Välj minst en muskelgrupp");

  const session = await findOrCreateSession(groups);
  updateTag(GYM_DATA_TAG);
  redirect(`/pass/${session.id}`);
}

// Jump straight into logging one specific exercise (e.g. from its detail page):
// resumes a recent session that trains its muscle group and adds it as an entry.
export async function startSessionForExercise(formData: FormData) {
  const exerciseId = String(formData.get("exerciseId") ?? "");
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) throw new Error("Övningen hittades inte");

  const session = await findOrCreateSessionForGroup(exercise.muscleGroup);
  await findOrCreateEntry(session.id, exercise.id);

  updateTag(GYM_DATA_TAG);
  redirect(`/pass/${session.id}`);
}

// Add another exercise to a session already in progress. A new exercise is tagged with
// the session's muscle group, or — when the session covers several — the one submitted
// alongside the name (which must be one of the session's groups).
export async function addExerciseToSession(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Passet hittades inte");

  let group = session.muscleGroups[0];
  if (session.muscleGroups.length > 1 && !formData.get("exerciseId")) {
    const chosen = String(formData.get("muscleGroup") ?? "");
    if (!isMuscleGroup(chosen) || !session.muscleGroups.includes(chosen)) {
      throw new Error("Välj muskelgrupp för övningen");
    }
    group = chosen;
  }

  const exerciseId = await resolveExercise(formData, group);
  await findOrCreateEntry(sessionId, exerciseId);

  updateTag(GYM_DATA_TAG);
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

  updateTag(GYM_DATA_TAG);
}

// Explicitly close a session so a later session with the same muscle groups
// starts fresh instead of being merged into this one by the resume window.
export async function finishSession(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Passet hittades inte");

  await prisma.session.update({ where: { id }, data: { finishedAt: new Date() } });

  updateTag(GYM_DATA_TAG);
  redirect("/");
}

// Deletes a whole logged workout (and, via cascade, its entries and sets).
export async function deleteSession(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.session.delete({ where: { id } });

  updateTag(GYM_DATA_TAG);
  redirect("/");
}

export async function deleteSet(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.workoutSet.delete({ where: { id } });
  updateTag(GYM_DATA_TAG);
}

// Only removes an entry that has no sets yet — safety net against accidental deletes.
export async function deleteEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.sessionEntry.deleteMany({ where: { id, sets: { none: {} } } });
  updateTag(GYM_DATA_TAG);
}

export async function logWeight(formData: FormData) {
  const weight = parseNumber(formData.get("weight"));
  if (Number.isNaN(weight) || weight <= 0) throw new Error("Ogiltig vikt");

  await prisma.bodyWeight.create({ data: { weight } });
  updateTag(GYM_DATA_TAG);
}

export async function deleteWeightEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.bodyWeight.delete({ where: { id } });
  updateTag(GYM_DATA_TAG);
}
