import { prisma } from "@/lib/prisma";
import type { WorkoutType } from "@prisma/client";
import { WORKOUT_TYPES } from "@/lib/workout-types";
import { estimate1RM } from "@/lib/format";

const DAY_MS = 1000 * 60 * 60 * 24;

function setVolume(sets: { weight: number; reps: number }[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

function topSet(sets: { weight: number; reps: number }[]) {
  if (sets.length === 0) return null;
  return sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0]);
}

// A session only "counts" once it has at least one logged set.
const LOGGED_SESSION_WHERE = { entries: { some: { sets: { some: {} } } } } as const;

type SessionWithEntries = {
  id: string;
  workoutType: WorkoutType;
  createdAt: Date;
  entries: {
    exercise: { id: string; name: string };
    sets: { weight: number; reps: number }[];
  }[];
};

function summarizeSession(session: SessionWithEntries) {
  const sets = session.entries.flatMap((e) => e.sets);
  return {
    id: session.id,
    createdAt: session.createdAt,
    workoutType: session.workoutType,
    exerciseNames: session.entries.map((e) => e.exercise.name),
    setCount: sets.length,
    volume: setVolume(sets),
    top: topSet(sets),
  };
}

export type WorkoutTypeSummary = {
  workoutType: WorkoutType;
  lastSession: ReturnType<typeof summarizeSession> | null;
  workoutsThisWeek: number;
  volumeThisWeek: number;
  volumeLastWeek: number;
  exerciseCount: number;
};

export type DashboardData = {
  types: WorkoutTypeSummary[];
  streakDays: number;
  workoutsThisWeek: number;
  workoutsLastWeek: number;
  volumeThisWeek: number;
  volumeLastWeek: number;
  setsThisWeek: number;
  recent: ReturnType<typeof summarizeSession>[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);

  const [latestPerType, exerciseCounts, recentSessions, streakDates] = await Promise.all([
    Promise.all(
      WORKOUT_TYPES.map((wt) =>
        prisma.session.findFirst({
          where: { workoutType: wt, ...LOGGED_SESSION_WHERE },
          orderBy: { createdAt: "desc" },
          include: { entries: { include: { exercise: true, sets: true } } },
        }),
      ),
    ),
    prisma.exercise.groupBy({ by: ["workoutType"], _count: { _all: true } }),
    prisma.session.findMany({
      where: { createdAt: { gte: twoWeeksAgo }, ...LOGGED_SESSION_WHERE },
      include: { entries: { include: { exercise: true, sets: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.session.findMany({
      where: LOGGED_SESSION_WHERE,
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const exerciseCountByType = new Map(exerciseCounts.map((c) => [c.workoutType, c._count._all]));
  const recentSummaries = recentSessions.map(summarizeSession);

  const types: WorkoutTypeSummary[] = WORKOUT_TYPES.map((wt, i) => {
    const last = latestPerType[i];
    const typeSessionsThisWeek = recentSummaries.filter((s) => s.workoutType === wt && s.createdAt >= weekStart);
    const typeSessionsLastWeek = recentSummaries.filter((s) => s.workoutType === wt && s.createdAt < weekStart);

    return {
      workoutType: wt,
      lastSession: last ? summarizeSession(last) : null,
      workoutsThisWeek: typeSessionsThisWeek.length,
      volumeThisWeek: typeSessionsThisWeek.reduce((sum, s) => sum + s.volume, 0),
      volumeLastWeek: typeSessionsLastWeek.reduce((sum, s) => sum + s.volume, 0),
      exerciseCount: exerciseCountByType.get(wt) ?? 0,
    };
  });

  const sessionsThisWeek = recentSummaries.filter((s) => s.createdAt >= weekStart);
  const sessionsLastWeek = recentSummaries.filter((s) => s.createdAt < weekStart);

  return {
    types,
    streakDays: computeStreak(streakDates.map((d) => d.createdAt)),
    workoutsThisWeek: sessionsThisWeek.length,
    workoutsLastWeek: sessionsLastWeek.length,
    volumeThisWeek: sessionsThisWeek.reduce((sum, s) => sum + s.volume, 0),
    volumeLastWeek: sessionsLastWeek.reduce((sum, s) => sum + s.volume, 0),
    setsThisWeek: sessionsThisWeek.reduce((sum, s) => sum + s.setCount, 0),
    recent: recentSummaries.slice(0, 8),
  };
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const dayKey = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const uniqueDays = Array.from(new Set(dates.map(dayKey))).sort((a, b) => b - a);

  const todayKey = dayKey(new Date());
  let cursor = todayKey;
  // Allow the streak to still count if today has no session yet, as long as yesterday does.
  if (uniqueDays[0] !== todayKey) {
    cursor = todayKey - DAY_MS;
  }

  let streak = 0;
  for (const day of uniqueDays) {
    if (day === cursor) {
      streak += 1;
      cursor -= DAY_MS;
    } else if (day < cursor) {
      break;
    }
  }
  return streak;
}

export async function getSessionHistory(workoutType: WorkoutType) {
  const sessions = await prisma.session.findMany({
    where: { workoutType, ...LOGGED_SESSION_WHERE },
    include: { entries: { include: { exercise: true, sets: true } } },
    orderBy: { createdAt: "desc" },
  });
  return sessions.map(summarizeSession);
}

export async function getExerciseCatalog(workoutType: WorkoutType) {
  return prisma.exercise.findMany({
    where: { workoutType },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function latestLoggedEntriesByExercise(exerciseIds: string[], before?: Date) {
  const byExercise = new Map<string, { createdAt: Date; sets: { weight: number; reps: number }[] }>();
  if (exerciseIds.length === 0) return byExercise;

  const entries = await prisma.sessionEntry.findMany({
    where: {
      exerciseId: { in: exerciseIds },
      sets: { some: {} },
      ...(before ? { createdAt: { lt: before } } : {}),
    },
    include: { sets: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  for (const entry of entries) {
    if (!byExercise.has(entry.exerciseId)) {
      byExercise.set(entry.exerciseId, { createdAt: entry.createdAt, sets: entry.sets });
    }
  }
  return byExercise;
}

async function personalBestByExercise(exerciseIds: string[]) {
  const bestByExercise = new Map<string, { weight: number; reps: number; date: Date }>();
  if (exerciseIds.length === 0) return bestByExercise;

  const entries = await prisma.sessionEntry.findMany({
    where: { exerciseId: { in: exerciseIds }, sets: { some: {} } },
    select: { exerciseId: true, createdAt: true, sets: { select: { weight: true, reps: true } } },
  });

  for (const entry of entries) {
    const best = topSet(entry.sets);
    if (!best) continue;
    const current = bestByExercise.get(entry.exerciseId);
    if (!current || best.weight > current.weight) {
      bestByExercise.set(entry.exerciseId, { weight: best.weight, reps: best.reps, date: entry.createdAt });
    }
  }
  return bestByExercise;
}

export async function getSessionDetail(id: string) {
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      entries: {
        include: { exercise: true, sets: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!session) return null;

  const exerciseIds = session.entries.map((e) => e.exerciseId);
  const [previousByExercise, prByExercise, catalog] = await Promise.all([
    latestLoggedEntriesByExercise(exerciseIds, session.createdAt),
    personalBestByExercise(exerciseIds),
    getExerciseCatalog(session.workoutType),
  ]);

  const addedExerciseIds = new Set(exerciseIds);
  const availableExercises = catalog.filter((ex) => !addedExerciseIds.has(ex.id));
  const previousByAvailableExercise = await latestLoggedEntriesByExercise(availableExercises.map((ex) => ex.id));

  return {
    id: session.id,
    workoutType: session.workoutType,
    createdAt: session.createdAt,
    entries: session.entries.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      exerciseName: e.exercise.name,
      sets: e.sets,
      previous: previousByExercise.get(e.exerciseId) ?? null,
      pr: prByExercise.get(e.exerciseId) ?? null,
    })),
    availableExercises: availableExercises.map((ex) => ({
      ...ex,
      previous: previousByAvailableExercise.get(ex.id) ?? null,
    })),
  };
}

export async function getExerciseQuickInfo(id: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: {
      entries: {
        where: { sets: { some: {} } },
        include: { sets: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!exercise) return null;

  const lastEntry = exercise.entries[0];
  return {
    id: exercise.id,
    name: exercise.name,
    workoutType: exercise.workoutType,
    lastLog: lastEntry ? { createdAt: lastEntry.createdAt, top: topSet(lastEntry.sets) } : null,
  };
}

export async function getExerciseDetail(id: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: {
      entries: {
        where: { sets: { some: {} } },
        include: { sets: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!exercise) return null;

  const sessions = exercise.entries.map((entry) => {
    const best = topSet(entry.sets);
    return {
      id: entry.id,
      createdAt: entry.createdAt,
      sets: entry.sets,
      volume: setVolume(entry.sets),
      topWeight: best?.weight ?? 0,
      est1RM: best ? Math.round(estimate1RM(best.weight, best.reps)) : 0,
    };
  });

  const pr = sessions.reduce<{ weight: number; reps: number; date: Date } | null>((best, s) => {
    const sessionBest = topSet(s.sets);
    if (!sessionBest) return best;
    if (!best || sessionBest.weight > best.weight) {
      return { weight: sessionBest.weight, reps: sessionBest.reps, date: s.createdAt };
    }
    return best;
  }, null);

  const bestVolumeSession = sessions.reduce<number>((max, s) => Math.max(max, s.volume), 0);
  const best1RM = sessions.reduce<number>((max, s) => Math.max(max, s.est1RM), 0);

  return {
    id: exercise.id,
    name: exercise.name,
    workoutType: exercise.workoutType,
    sessions: sessions.reverse(), // newest first for the history table
    chartData: sessions.map((s) => ({
      date: s.createdAt,
      topWeight: s.topWeight,
      volume: s.volume,
      est1RM: s.est1RM,
    })),
    pr,
    bestVolumeSession,
    best1RM,
  };
}

export type WeeklyBucket = {
  weekStart: Date;
  volume: number;
  workouts: number;
  sets: number;
};

export async function getTrendsData(weeks = 12) {
  const now = new Date();
  const rangeStart = new Date(now.getTime() - weeks * 7 * DAY_MS);

  const [sessions, exercises] = await Promise.all([
    prisma.session.findMany({
      where: { createdAt: { gte: rangeStart }, ...LOGGED_SESSION_WHERE },
      include: { entries: { include: { sets: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.exercise.findMany({
      include: { entries: { include: { sets: true } } },
    }),
  ]);

  const buckets: WeeklyBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * DAY_MS);
    const weekEnd = new Date(now.getTime() - i * 7 * DAY_MS);
    const weekSessions = sessions.filter((s) => s.createdAt >= weekStart && s.createdAt < weekEnd);
    const sets = weekSessions.flatMap((s) => s.entries.flatMap((e) => e.sets));
    buckets.push({
      weekStart,
      volume: setVolume(sets),
      workouts: weekSessions.length,
      sets: sets.length,
    });
  }

  const balanceStart = new Date(now.getTime() - 30 * DAY_MS);
  const balance = WORKOUT_TYPES.map((wt) => {
    const sets = sessions
      .filter((s) => s.workoutType === wt && s.createdAt >= balanceStart)
      .flatMap((s) => s.entries.flatMap((e) => e.sets));
    return { workoutType: wt, sets: sets.length, volume: setVolume(sets) };
  });

  const records = exercises
    .map((ex) => {
      const allSets = ex.entries.flatMap((e) => e.sets);
      const best = topSet(allSets);
      if (!best) return null;
      return {
        id: ex.id,
        name: ex.name,
        workoutType: ex.workoutType,
        weight: best.weight,
        reps: best.reps,
        est1RM: Math.round(estimate1RM(best.weight, best.reps)),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.est1RM - a.est1RM);

  return { buckets, balance, records };
}
