import { PrismaClient, MuscleGroup } from "@prisma/client";

const prisma = new PrismaClient();

const CATALOG: Record<MuscleGroup, string[]> = {
  CHEST: ["Bänkpress", "Lutande bänkpress", "Hantelpress", "Cable fly"],
  BACK: ["Marklyft", "Latsdrag", "Sittande rodd", "Pull-ups", "Ryggresning"],
  SHOULDERS: ["Axelpress", "Sidolyft", "Frontlyft", "Bakre delt", "Shrugs"],
  BICEPS: ["Bicepscurl", "Hammercurl"],
  TRICEPS: ["Triceps pushdown", "Franska pressar", "Dips"],
  LEGS: ["Knäböj", "Benpress", "Utfallssteg", "Bencurl", "Benspark", "Vadpress"],
  ABS: ["Situps", "Plankan", "Cable crunch", "Hängande benlyft", "Russian twist"],
};

async function main() {
  for (const [muscleGroup, names] of Object.entries(CATALOG) as [MuscleGroup, string[]][]) {
    for (const name of names) {
      await prisma.exercise.upsert({
        where: { name_muscleGroup: { name, muscleGroup } },
        update: {},
        create: { name, muscleGroup },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
