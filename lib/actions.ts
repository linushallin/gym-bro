"use server";

import { prisma } from "@/lib/prisma";
import { isMuscleGroup, sortGroups } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@prisma/client";
import { updateTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { userDataTag } from "@/lib/queries";
import { requireUser } from "@/lib/auth";

// Server Actions are public HTTP endpoints: anyone can call them with any form
// data. So each one authenticates via requireUser() and every lookup/write is
// filtered by the caller's userId — an id belonging to someone else behaves
// exactly like an id that doesn't exist.

const SESSION_RESUME_WINDOW_MS = 6 * 60 * 60 * 1000; // reuse a session started within the last 6h
const MAX_EXERCISE_NAME_LENGTH = 80;
const MAX_WEIGHT_KG = 1000;
const MAX_REPS = 1000;
const MAX_BODY_WEIGHT_KG = 500;

function parseNumber(value: FormDataEntryValue | null): number {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

async function findOwnedSession(userId: string, id: string) {
  if (!id) notFound();
  const session = await prisma.session.findFirst({ where: { id, userId } });
  if (!session) notFound();
  return session;
}

async function resolveExercise(userId: string, formData: FormData, muscleGroup: MuscleGroup): Promise<string> {
  const existingExerciseId = formString(formData, "exerciseId");
  if (existingExerciseId) {
    const exercise = await prisma.exercise.findFirst({
      where: { id: existingExerciseId, userId },
      select: { id: true },
    });
    if (!exercise) notFound();
    return exercise.id;
  }

  const name = formString(formData, "name").trim().slice(0, MAX_EXERCISE_NAME_LENGTH);
  if (!name) throw new Error("Namn krävs");

  const exercise = await prisma.exercise.upsert({
    where: { userId_muscleGroup_name: { userId, muscleGroup, name } },
    update: {},
    create: { userId, name, muscleGroup },
  });
  return exercise.id;
}

// Resume an unfinished session started within the window that covers exactly the same
// set of muscle groups; otherwise start a fresh one. Groups are stored sorted so the
// equality match is stable regardless of the order they were picked in.
async function findOrCreateSession(userId: string, groups: MuscleGroup[]) {
  const muscleGroups = sortGroups(groups);
  const resumeAfter = new Date(Date.now() - SESSION_RESUME_WINDOW_MS);
  const existing = await prisma.session.findFirst({
    where: { userId, muscleGroups: { equals: muscleGroups }, createdAt: { gte: resumeAfter }, finishedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.session.create({ data: { userId, muscleGroups } });
}

// Resume/create a session that trains a single muscle group — used when jumping
// straight into one exercise. Reuses any recent unfinished session that includes it.
async function findOrCreateSessionForGroup(userId: string, group: MuscleGroup) {
  const resumeAfter = new Date(Date.now() - SESSION_RESUME_WINDOW_MS);
  const existing = await prisma.session.findFirst({
    where: { userId, muscleGroups: { has: group }, createdAt: { gte: resumeAfter }, finishedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.session.create({ data: { userId, muscleGroups: [group] } });
}

// Callers must already have verified that both the session and the exercise
// belong to the current user.
async function findOrCreateEntry(sessionId: string, exerciseId: string) {
  const existing = await prisma.sessionEntry.findFirst({ where: { sessionId, exerciseId } });
  if (existing) return existing;

  return prisma.sessionEntry.create({ data: { sessionId, exerciseId } });
}

// Start (or resume) a session for one or more chosen muscle groups, no exercise yet.
export async function startSession(formData: FormData) {
  const user = await requireUser();
  const groups = formData.getAll("muscleGroups").map(String).filter(isMuscleGroup);
  if (groups.length === 0) throw new Error("Välj minst en muskelgrupp");

  const session = await findOrCreateSession(user.id, groups);
  updateTag(userDataTag(user.id));
  redirect(`/pass/${session.id}`);
}

// Jump straight into logging one specific exercise (e.g. from its detail page):
// resumes a recent session that trains its muscle group and adds it as an entry.
export async function startSessionForExercise(formData: FormData) {
  const user = await requireUser();
  const exerciseId = formString(formData, "exerciseId");
  const exercise = await prisma.exercise.findFirst({ where: { id: exerciseId, userId: user.id } });
  if (!exercise) notFound();

  const session = await findOrCreateSessionForGroup(user.id, exercise.muscleGroup);
  await findOrCreateEntry(session.id, exercise.id);

  updateTag(userDataTag(user.id));
  redirect(`/pass/${session.id}`);
}

// Add another exercise to a session already in progress. A new exercise is tagged with
// the session's muscle group, or — when the session covers several — the one submitted
// alongside the name (which must be one of the session's groups).
export async function addExerciseToSession(formData: FormData) {
  const user = await requireUser();
  const session = await findOwnedSession(user.id, formString(formData, "sessionId"));

  let group = session.muscleGroups[0];
  if (session.muscleGroups.length > 1 && !formData.get("exerciseId")) {
    const chosen = formString(formData, "muscleGroup");
    if (!isMuscleGroup(chosen) || !session.muscleGroups.includes(chosen)) {
      throw new Error("Välj muskelgrupp för övningen");
    }
    group = chosen;
  }

  const exerciseId = await resolveExercise(user.id, formData, group);
  await findOrCreateEntry(session.id, exerciseId);

  updateTag(userDataTag(user.id));
}

export async function addSet(formData: FormData) {
  const user = await requireUser();
  const sessionEntryId = formString(formData, "sessionEntryId");
  const weight = parseNumber(formData.get("weight"));
  const reps = parseNumber(formData.get("reps"));

  if (
    !sessionEntryId ||
    Number.isNaN(weight) ||
    Number.isNaN(reps) ||
    weight < 0 ||
    weight > MAX_WEIGHT_KG ||
    reps <= 0 ||
    reps > MAX_REPS
  ) {
    throw new Error("Ogiltigt set");
  }

  const entry = await prisma.sessionEntry.findFirst({
    where: { id: sessionEntryId, session: { userId: user.id } },
    select: { id: true },
  });
  if (!entry) notFound();

  await prisma.workoutSet.create({
    data: { sessionEntryId: entry.id, weight, reps: Math.round(reps) },
  });

  updateTag(userDataTag(user.id));
}

// Explicitly close a session so a later session with the same muscle groups
// starts fresh instead of being merged into this one by the resume window.
export async function finishSession(formData: FormData) {
  const user = await requireUser();
  const session = await findOwnedSession(user.id, formString(formData, "id"));

  await prisma.session.update({ where: { id: session.id }, data: { finishedAt: new Date() } });

  updateTag(userDataTag(user.id));
  redirect("/");
}

// Deletes a whole logged workout (and, via cascade, its entries and sets).
export async function deleteSession(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");
  if (!id) return;

  await prisma.session.deleteMany({ where: { id, userId: user.id } });

  updateTag(userDataTag(user.id));
  redirect("/");
}

export async function deleteSet(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");
  if (!id) return;
  await prisma.workoutSet.deleteMany({ where: { id, sessionEntry: { session: { userId: user.id } } } });
  updateTag(userDataTag(user.id));
}

// Only removes an entry that has no sets yet — safety net against accidental deletes.
export async function deleteEntry(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");
  if (!id) return;
  await prisma.sessionEntry.deleteMany({ where: { id, sets: { none: {} }, session: { userId: user.id } } });
  updateTag(userDataTag(user.id));
}

export async function logWeight(formData: FormData) {
  const user = await requireUser();
  const weight = parseNumber(formData.get("weight"));
  if (Number.isNaN(weight) || weight <= 0 || weight > MAX_BODY_WEIGHT_KG) throw new Error("Ogiltig vikt");

  await prisma.bodyWeight.create({ data: { userId: user.id, weight } });
  updateTag(userDataTag(user.id));
}

export async function deleteWeightEntry(formData: FormData) {
  const user = await requireUser();
  const id = formString(formData, "id");
  if (!id) return;
  await prisma.bodyWeight.deleteMany({ where: { id, userId: user.id } });
  updateTag(userDataTag(user.id));
}
