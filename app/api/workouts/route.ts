import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();

  console.log("WORKOUT BODY:", body);

  const workout = await prisma.workout.create({
    data: {
      exercise: body.exercise,
    },
    include: {
      sets: true,
    },
  });

  return Response.json(workout);
}

export async function GET() {
  try {
    const workouts = await prisma.workout.findMany({
      include: {
        sets: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json(workouts);
  } catch (error) {
    console.error("GET ERROR:", error);
    return Response.json([], { status: 200 });
  }
}
