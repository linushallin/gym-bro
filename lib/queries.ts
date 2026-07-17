import { prisma } from "@/lib/prisma";
import type { MuscleGroup } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { MUSCLE_GROUPS } from "@/lib/muscle-groups";
import { estimate1RM } from "@/lib/format";

const DAY_MS = 1000 * 60 * 60 * 24;

// All reads are cached indefinitely and only invalidated by revalidateTag("gym-data"),
// called from every mutating action in lib/actions.ts. Single-user app, so one broad
// tag covering all queries is simpler than granular tags and matches how the actions
// already treat every write as invalidating everything.
export const GYM_DATA_TAG = "gym-data";

// unstable_cache serializes results to JSON to persist them, so on a cache hit it
// hands back plain ISO strings instead of the original Date objects (a cache miss
// returns the real Dates untouched, which is why this only shows up intermittently).
// Revive them so callers can keep treating every createdAt/date field as a Date.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function reviveDates<T>(value: T): T {
  if (typeof value === "string") {
    return (ISO_DATE_RE.test(value) ? new Date(value) : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(reviveDates) as T;
  }
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, reviveDates(v)])) as T;
  }
  return value;
}

function setVolume(sets: { weight: number; reps: number }[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

function topSet(sets: { weight: number; reps: number }[]) {
  if (sets.length === 0) return null;
  return sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0]);
}

// A session only "counts" once it has at least one logged set.
const LOGGED_SESSION_WHERE = { entries: { some: { sets: { some: {} } } } } as const;

function dayKey(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

// Monday of the calendar week containing `d`.
function mondayOfWeek(d: Date): number {
  const key = dayKey(d);
  const weekday = new Date(key).getUTCDay() || 7; // Mon=1..Sun=7
  return key - (weekday - 1) * DAY_MS;
}

// ISO 8601 week number (matches the Swedish "v. 28" convention).
function isoWeekNumber(d: Date): number {
  const key = dayKey(d);
  const weekday = new Date(key).getUTCDay() || 7;
  const thursday = key + (4 - weekday) * DAY_MS; // nearest Thursday
  const yearStart = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1);
  return Math.ceil(((thursday - yearStart) / DAY_MS + 1) / 7);
}

type SessionWithEntries = {
  id: string;
  muscleGroups: MuscleGroup[];
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
    muscleGroups: session.muscleGroups,
    exerciseNames: session.entries.map((e) => e.exercise.name),
    setCount: sets.length,
    volume: setVolume(sets),
    top: topSet(sets),
  };
}

export type DayActivity = {
  date: Date;
  muscleGroups: MuscleGroup[];
};

export type DashboardData = {
  streakDays: number;
  workoutsThisWeek: number;
  workoutsLastWeek: number;
  volumeThisWeek: number;
  volumeLastWeek: number;
  setsThisWeek: number;
  weekNumber: number;
  weekActivity: DayActivity[];
};

const cachedGetDashboardData = unstable_cache(
  _getDashboardData,
  ["dashboard"],
  // revalidate on a timer too, not just on write: streak/week-activity depend on
  // the current date, which moves even when nobody logs a new set.
  { tags: [GYM_DATA_TAG], revalidate: 300 },
);

export async function getDashboardData(): Promise<DashboardData> {
  return reviveDates(await cachedGetDashboardData());
}

async function _getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
  // Calendar week (Monday-Sunday), matching weekActivity/weekNumber below —
  // not a rolling 7-day window, which would still show mostly last week's
  // data on a Monday.
  const weekStart = new Date(mondayOfWeek(now));
  const lastWeekStart = new Date(mondayOfWeek(now) - 7 * DAY_MS);

  const [recentSessions, streakDates] = await Promise.all([
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

  const recentSummaries = recentSessions.map(summarizeSession);

  const sessionsThisWeek = recentSummaries.filter((s) => s.createdAt >= weekStart);
  const sessionsLastWeek = recentSummaries.filter((s) => s.createdAt >= lastWeekStart && s.createdAt < weekStart);

  // Current calendar week, Monday through Sunday. Each day shows the union of every
  // muscle group trained across that day's sessions, in canonical order.
  const mondayKey = weekStart.getTime();
  const trainedByDay = new Map<number, Set<MuscleGroup>>();
  for (const s of recentSummaries) {
    const key = dayKey(s.createdAt);
    if (key < mondayKey || key >= mondayKey + 7 * DAY_MS) continue;
    const groups = trainedByDay.get(key) ?? new Set<MuscleGroup>();
    for (const g of s.muscleGroups) groups.add(g);
    trainedByDay.set(key, groups);
  }
  const weekActivity: DayActivity[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mondayKey + i * DAY_MS);
    const groups = trainedByDay.get(date.getTime());
    return { date, muscleGroups: groups ? MUSCLE_GROUPS.filter((g) => groups.has(g)) : [] };
  });

  return {
    streakDays: computeStreak(streakDates.map((d) => d.createdAt)),
    workoutsThisWeek: sessionsThisWeek.length,
    workoutsLastWeek: sessionsLastWeek.length,
    volumeThisWeek: sessionsThisWeek.reduce((sum, s) => sum + s.volume, 0),
    volumeLastWeek: sessionsLastWeek.reduce((sum, s) => sum + s.volume, 0),
    setsThisWeek: sessionsThisWeek.reduce((sum, s) => sum + s.setCount, 0),
    weekNumber: isoWeekNumber(now),
    weekActivity,
  };
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
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

const cachedGetSessionHistory = unstable_cache(
  async (group: MuscleGroup) => {
    const sessions = await prisma.session.findMany({
      where: { muscleGroups: { has: group }, ...LOGGED_SESSION_WHERE },
      include: { entries: { include: { exercise: true, sets: true } } },
      orderBy: { createdAt: "desc" },
    });
    return sessions.map(summarizeSession);
  },
  ["session-history"],
  { tags: [GYM_DATA_TAG] },
);

export async function getSessionHistory(group: MuscleGroup) {
  return reviveDates(await cachedGetSessionHistory(group));
}

const cachedGetExerciseCatalog = unstable_cache(
  async (groups: MuscleGroup[]) => {
    return prisma.exercise.findMany({
      where: { muscleGroup: { in: groups } },
      select: { id: true, name: true, muscleGroup: true },
      orderBy: { name: "asc" },
    });
  },
  ["exercise-catalog"],
  { tags: [GYM_DATA_TAG] },
);

export async function getExerciseCatalog(groups: MuscleGroup[]) {
  return reviveDates(await cachedGetExerciseCatalog(groups));
}

// Every logged entry for a workout type, newest first — covers both exercises already
// in the session (need the latest one *before* it started) and exercises still
// available to add (need the latest one overall). One query instead of two lets it run
// in the same Promise.all as the catalog/PR lookups, instead of waiting on the catalog
// result first to know which exercise ids to ask about.
async function latestLoggedEntriesByMuscleGroups(groups: MuscleGroup[]) {
  return prisma.sessionEntry.findMany({
    where: { exercise: { muscleGroup: { in: groups } }, sets: { some: {} } },
    include: { sets: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
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

const cachedGetSessionDetail = unstable_cache(_getSessionDetail, ["session-detail"], { tags: [GYM_DATA_TAG] });

export async function getSessionDetail(id: string) {
  return reviveDates(await cachedGetSessionDetail(id));
}

async function _getSessionDetail(id: string) {
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
  const [groupEntries, prByExercise, catalog] = await Promise.all([
    latestLoggedEntriesByMuscleGroups(session.muscleGroups),
    personalBestByExercise(exerciseIds),
    getExerciseCatalog(session.muscleGroups),
  ]);

  // groupEntries is sorted newest-first, so the first entry seen per exercise id
  // is its latest — for "available" exercises that's the latest overall, for exercises
  // already in this session it's the latest one strictly before it started.
  const previousByExercise = new Map<string, { createdAt: Date; sets: { weight: number; reps: number }[] }>();
  const previousByAvailableExercise = new Map<string, { createdAt: Date; sets: { weight: number; reps: number }[] }>();
  for (const entry of groupEntries) {
    if (!previousByAvailableExercise.has(entry.exerciseId)) {
      previousByAvailableExercise.set(entry.exerciseId, { createdAt: entry.createdAt, sets: entry.sets });
    }
    if (entry.createdAt < session.createdAt && !previousByExercise.has(entry.exerciseId)) {
      previousByExercise.set(entry.exerciseId, { createdAt: entry.createdAt, sets: entry.sets });
    }
  }

  const addedExerciseIds = new Set(exerciseIds);
  const availableExercises = catalog.filter((ex) => !addedExerciseIds.has(ex.id));

  return {
    id: session.id,
    muscleGroups: session.muscleGroups,
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

const cachedGetExerciseQuickInfo = unstable_cache(_getExerciseQuickInfo, ["exercise-quick-info"], {
  tags: [GYM_DATA_TAG],
});

export async function getExerciseQuickInfo(id: string) {
  return reviveDates(await cachedGetExerciseQuickInfo(id));
}

async function _getExerciseQuickInfo(id: string) {
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
    muscleGroup: exercise.muscleGroup,
    lastLog: lastEntry ? { createdAt: lastEntry.createdAt, top: topSet(lastEntry.sets) } : null,
  };
}

const cachedGetExerciseDetail = unstable_cache(_getExerciseDetail, ["exercise-detail"], { tags: [GYM_DATA_TAG] });

export async function getExerciseDetail(id: string) {
  return reviveDates(await cachedGetExerciseDetail(id));
}

async function _getExerciseDetail(id: string) {
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
    muscleGroup: exercise.muscleGroup,
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

const cachedGetTrendsData = unstable_cache(
  _getTrendsData,
  ["trends"],
  // same reasoning as getDashboardData: week bucket boundaries are relative to "now".
  { tags: [GYM_DATA_TAG], revalidate: 300 },
);

export async function getTrendsData(weeks = 12) {
  return reviveDates(await cachedGetTrendsData(weeks));
}

async function _getTrendsData(weeks = 12) {
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

  // Attribute each set to its exercise's own muscle group (not the session's groups),
  // so a combined session like chest+triceps splits correctly instead of double-counting.
  const balanceStart = new Date(now.getTime() - 30 * DAY_MS);
  const balanceByGroup = new Map<MuscleGroup, { sets: number; volume: number }>();
  for (const ex of exercises) {
    const recentSets = ex.entries.filter((e) => e.createdAt >= balanceStart).flatMap((e) => e.sets);
    if (recentSets.length === 0) continue;
    const cur = balanceByGroup.get(ex.muscleGroup) ?? { sets: 0, volume: 0 };
    cur.sets += recentSets.length;
    cur.volume += setVolume(recentSets);
    balanceByGroup.set(ex.muscleGroup, cur);
  }
  const balance = MUSCLE_GROUPS.map((group) => ({
    muscleGroup: group,
    sets: balanceByGroup.get(group)?.sets ?? 0,
    volume: balanceByGroup.get(group)?.volume ?? 0,
  }));

  const records = exercises
    .map((ex) => {
      const allSets = ex.entries.flatMap((e) => e.sets);
      const best = topSet(allSets);
      if (!best) return null;
      return {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        weight: best.weight,
        reps: best.reps,
        est1RM: Math.round(estimate1RM(best.weight, best.reps)),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.est1RM - a.est1RM);

  return { buckets, balance, records };
}

export type WeightEntry = {
  id: string;
  weight: number;
  createdAt: Date;
};

export type WeightData = {
  entries: WeightEntry[]; // newest first
  latest: number | null;
  weekChange: number | null; // change vs the last entry at least 7 days before the latest one
};

const cachedGetWeightData = unstable_cache(_getWeightData, ["weight"], { tags: [GYM_DATA_TAG] });

export async function getWeightData(): Promise<WeightData> {
  return reviveDates(await cachedGetWeightData());
}

async function _getWeightData(): Promise<WeightData> {
  const entries = await prisma.bodyWeight.findMany({ orderBy: { createdAt: "desc" } });
  if (entries.length === 0) return { entries, latest: null, weekChange: null };

  const latest = entries[0].weight;
  const weekAgoCutoff = new Date(entries[0].createdAt.getTime() - 7 * DAY_MS);
  // entries is newest-first, so the first one at or before the cutoff is the
  // most recent qualifying entry. Falls back to the oldest entry when the
  // whole history is younger than 7 days.
  let reference = entries[entries.length - 1];
  for (const e of entries) {
    if (e.createdAt <= weekAgoCutoff) {
      reference = e;
      break;
    }
  }
  const weekChange = entries.length > 1 ? latest - reference.weight : null;

  return { entries, latest, weekChange };
}
