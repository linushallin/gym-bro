import "server-only";
import type { MuscleGroup } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Every new account starts with these so the "add exercise" list isn't empty
// on the first workout. Users can add their own on top.
const STARTER_CATALOG: Record<MuscleGroup, string[]> = {
  CHEST: ["Bänkpress", "Lutande bänkpress", "Hantelpress", "Cable fly"],
  BACK: ["Marklyft", "Latsdrag", "Sittande rodd", "Pull-ups", "Ryggresning"],
  SHOULDERS: ["Axelpress", "Sidolyft", "Frontlyft", "Bakre delt", "Shrugs"],
  BICEPS: ["Bicepscurl", "Hammercurl"],
  TRICEPS: ["Triceps pushdown", "Franska pressar", "Dips"],
  LEGS: ["Knäböj", "Benpress", "Utfallssteg", "Bencurl", "Benspark", "Vadpress"],
  ABS: ["Situps", "Plankan", "Cable crunch", "Hängande benlyft", "Russian twist"],
};

// Idempotent: safe to call on every email confirmation.
export async function ensureStarterCatalog(userId: string) {
  const existing = await prisma.exercise.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.exercise.createMany({
    data: (Object.entries(STARTER_CATALOG) as [MuscleGroup, string[]][]).flatMap(([muscleGroup, names]) =>
      names.map((name) => ({ userId, muscleGroup, name })),
    ),
    skipDuplicates: true,
  });
}
