import { PrismaClient, WorkoutType } from "@prisma/client";

const prisma = new PrismaClient();

const CATALOG: Record<WorkoutType, string[]> = {
  SHOULDERS: ["Axelpress", "Sidolyft", "Frontlyft", "Bakre delt", "Shrugs"],
  BACK_BICEPS: ["Marklyft", "Latsdrag", "Sittande rodd", "Pull-ups", "Ryggresning", "Bicepscurl", "Hammercurl"],
  CHEST_TRICEPS: ["Bänkpress", "Lutande bänkpress", "Hantelpress", "Cable fly", "Dips", "Triceps pushdown", "Franska pressar"],
  LEGS: ["Knäböj", "Benpress", "Utfallssteg", "Bencurl", "Benspark", "Vadpress"],
  ABS: ["Situps", "Plankan", "Cable crunch", "Hängande benlyft", "Russian twist"],
  ARMS: ["Bicepscurl", "Hammercurl", "Triceps pushdown", "Franska pressar", "Dips"],
  BACK_CHEST: ["Marklyft", "Latsdrag", "Bänkpress", "Dips"],
  SHOULDERS_ARMS: ["Axelpress", "Sidolyft", "Shrugs", "Bicepscurl", "Triceps pushdown"],
};

async function main() {
  for (const [workoutType, names] of Object.entries(CATALOG) as [WorkoutType, string[]][]) {
    for (const name of names) {
      await prisma.exercise.upsert({
        where: { name_workoutType: { name, workoutType } },
        update: {},
        create: { name, workoutType },
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
