import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.workoutId) {
    return Response.json({ error: "workoutId is required" }, { status: 400 });
  }

  const set = await prisma.workoutSet.create({
    data: {
      weight: body.weight,
      reps: body.reps,
      workoutId: body.workoutId,
    },
  });

  return Response.json(set);
}
