import "server-only";
import { prisma } from "@/lib/prisma";
import type { MuscleGroup } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { MUSCLE_GROUPS } from "@/lib/muscle-groups";
import { estimate1RM } from "@/lib/format";

const DAY_MS = 1000 * 60 * 60 * 24;

// All reads are cached per user and invalidated by updateTag(userDataTag(userId)),
// called from every mutating action in lib/actions.ts. One tag per user (rather than
// per query) keeps invalidation simple — any write by a user refreshes all of their
// views — while one user's writes never evict anyone else's cache entries.
//
// Every exported query takes the *authenticated* user's id as its first argument and
// filters on it, so a guessed or leaked id from another account simply isn't found.
// Callers must get userId from requireUser(), never from request input.
export function userDataTag(userId: string) {
  return `gym-data:${userId}`;
}

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

// unstable_cache folds the call arguments (userId first) into the cache key, and the
// per-user tag lets that user's writes invalidate exactly their own entries.
function cachedPerUser<A extends unknown[], R>(
  keyPart: string,
  fn: (userId: string, ...args: A) => Promise<R>,
  options: { revalidate?: number } = {},
) {
  return async (userId: string, ...args: A): Promise<R> => {
    const cached = unstable_cache(fn, [keyPart], { tags: [userDataTag(userId)], ...options });
    return reviveDates(await cached(userId, ...args));
  };
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
  weekNumber: number;
  weekActivity: DayActivity[];
};

export const getDashboardData = cachedPerUser(
  "dashboard",
  _getDashboardData,
  // revalidate on a timer too, not just on write: streak/week-activity depend on
  // the current date, which moves even when nobody logs a new set.
  { revalidate: 300 },
);

async function _getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();
  // Calendar week (Monday-Sunday), matching weekActivity/weekNumber below —
  // not a rolling 7-day window, which would still show mostly last week's
  // data on a Monday.
  const weekStart = new Date(mondayOfWeek(now));

  const [sessionsThisWeek, streakDates] = await Promise.all([
    prisma.session.findMany({
      where: { userId, createdAt: { gte: weekStart }, ...LOGGED_SESSION_WHERE },
      select: { createdAt: true, muscleGroups: true },
    }),
    prisma.session.findMany({
      where: { userId, ...LOGGED_SESSION_WHERE },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  // Current calendar week, Monday through Sunday. Each day shows the union of every
  // muscle group trained across that day's sessions, in canonical order.
  const mondayKey = weekStart.getTime();
  const trainedByDay = new Map<number, Set<MuscleGroup>>();
  for (const s of sessionsThisWeek) {
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

export const getSessionHistory = cachedPerUser("session-history", async (userId: string, group: MuscleGroup) => {
  const sessions = await prisma.session.findMany({
    where: { userId, muscleGroups: { has: group }, ...LOGGED_SESSION_WHERE },
    include: { entries: { include: { exercise: true, sets: true } } },
    orderBy: { createdAt: "desc" },
  });
  return sessions.map(summarizeSession);
});

export const getExerciseCatalog = cachedPerUser("exercise-catalog", async (userId: string, groups: MuscleGroup[]) => {
  return prisma.exercise.findMany({
    where: { userId, muscleGroup: { in: groups } },
    select: { id: true, name: true, muscleGroup: true },
    orderBy: { name: "asc" },
  });
});

// Every logged entry for a workout type, newest first — covers both exercises already
// in the session (need the latest one *before* it started) and exercises still
// available to add (need the latest one overall). One query instead of two lets it run
// in the same Promise.all as the catalog/PR lookups, instead of waiting on the catalog
// result first to know which exercise ids to ask about.
async function latestLoggedEntriesByMuscleGroups(userId: string, groups: MuscleGroup[]) {
  return prisma.sessionEntry.findMany({
    where: { exercise: { userId, muscleGroup: { in: groups } }, sets: { some: {} } },
    include: { sets: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

async function personalBestByExercise(userId: string, exerciseIds: string[]) {
  const bestByExercise = new Map<string, { weight: number; reps: number; date: Date }>();
  if (exerciseIds.length === 0) return bestByExercise;

  const entries = await prisma.sessionEntry.findMany({
    where: { exerciseId: { in: exerciseIds }, exercise: { userId }, sets: { some: {} } },
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

export const getSessionDetail = cachedPerUser("session-detail", _getSessionDetail);

async function _getSessionDetail(userId: string, id: string) {
  const session = await prisma.session.findFirst({
    where: { id, userId },
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
    latestLoggedEntriesByMuscleGroups(userId, session.muscleGroups),
    personalBestByExercise(userId, exerciseIds),
    getExerciseCatalog(userId, session.muscleGroups),
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

export const getExerciseDetail = cachedPerUser("exercise-detail", _getExerciseDetail);

async function _getExerciseDetail(userId: string, id: string) {
  const exercise = await prisma.exercise.findFirst({
    where: { id, userId },
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
    sessions: [...sessions].reverse(), // newest first for the history table (copy: chartData below needs oldest first)
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
  weekNumber: number;
  workouts: number;
  sets: number;
  volume: number;
};

export type PeriodTotals = { workouts: number; sets: number; volume: number };

export type PersonalRecord = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  weight: number;
  reps: number;
  est1RM: number;
  date: Date;
};

export type TrendsData = {
  periodStart: Date;
  buckets: WeeklyBucket[]; // oldest first, one per calendar week, current week last
  current: PeriodTotals;
  previous: PeriodTotals; // the same number of weeks immediately before the period
  balance: { muscleGroup: MuscleGroup; sets: number; volume: number }[]; // canonical order
  records: PersonalRecord[]; // all-time, strongest estimated 1RM first
};

export const getTrendsData = cachedPerUser(
  "trends",
  _getTrendsData,
  // same reasoning as getDashboardData: week bucket boundaries are relative to "now".
  { revalidate: 300 },
);

// Everything on the trends page is scoped to the same period: the last `weeks`
// calendar weeks (Monday-Sunday, the current week included), matching the
// "v. 42" weeks on the overview. Personal records are all-time, but carry the
// date they were set so the page can flag the ones that are new this period.
async function _getTrendsData(userId: string, weeks: number): Promise<TrendsData> {
  const now = new Date();
  const weekMs = 7 * DAY_MS;
  const periodStartKey = mondayOfWeek(now) - (weeks - 1) * weekMs;
  const previousStartKey = periodStartKey - weeks * weekMs;

  const [sessions, exercises] = await Promise.all([
    prisma.session.findMany({
      where: { userId, createdAt: { gte: new Date(previousStartKey) }, ...LOGGED_SESSION_WHERE },
      select: {
        createdAt: true,
        entries: {
          select: {
            exercise: { select: { muscleGroup: true } },
            sets: { select: { weight: true, reps: true } },
          },
        },
      },
    }),
    prisma.exercise.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        muscleGroup: true,
        entries: { select: { createdAt: true, sets: { select: { weight: true, reps: true } } } },
      },
    }),
  ]);

  const buckets: WeeklyBucket[] = Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date(periodStartKey + i * weekMs);
    return { weekStart, weekNumber: isoWeekNumber(weekStart), workouts: 0, sets: 0, volume: 0 };
  });
  const previous: PeriodTotals = { workouts: 0, sets: 0, volume: 0 };
  const balanceByGroup = new Map<MuscleGroup, { sets: number; volume: number }>();

  for (const session of sessions) {
    const key = dayKey(session.createdAt);
    const sets = session.entries.flatMap((e) => e.sets);
    const totals = key >= periodStartKey ? buckets[Math.floor((key - periodStartKey) / weekMs)] : previous;
    if (!totals) continue; // logged in a future week (clock skew) — ignore
    totals.workouts += 1;
    totals.sets += sets.length;
    totals.volume += setVolume(sets);

    if (key < periodStartKey) continue;
    // Attribute each set to its exercise's own muscle group (not the session's groups),
    // so a combined session like chest+triceps splits correctly instead of double-counting.
    for (const entry of session.entries) {
      const cur = balanceByGroup.get(entry.exercise.muscleGroup) ?? { sets: 0, volume: 0 };
      cur.sets += entry.sets.length;
      cur.volume += setVolume(entry.sets);
      balanceByGroup.set(entry.exercise.muscleGroup, cur);
    }
  }

  const current: PeriodTotals = {
    workouts: buckets.reduce((sum, b) => sum + b.workouts, 0),
    sets: buckets.reduce((sum, b) => sum + b.sets, 0),
    volume: buckets.reduce((sum, b) => sum + b.volume, 0),
  };

  const balance = MUSCLE_GROUPS.map((group) => ({
    muscleGroup: group,
    sets: balanceByGroup.get(group)?.sets ?? 0,
    volume: balanceByGroup.get(group)?.volume ?? 0,
  }));

  const records = exercises
    .map((ex): PersonalRecord | null => {
      let best: { weight: number; reps: number; date: Date } | null = null;
      for (const entry of ex.entries) {
        const top = topSet(entry.sets);
        if (top && (!best || top.weight > best.weight)) best = { ...top, date: entry.createdAt };
      }
      if (!best) return null;
      return {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        weight: best.weight,
        reps: best.reps,
        est1RM: Math.round(estimate1RM(best.weight, best.reps)),
        date: best.date,
      };
    })
    .filter((r): r is PersonalRecord => r !== null)
    .sort((a, b) => b.est1RM - a.est1RM);

  return { periodStart: new Date(periodStartKey), buckets, current, previous, balance, records };
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

export const getWeightData = cachedPerUser("weight", _getWeightData);

async function _getWeightData(userId: string): Promise<WeightData> {
  const entries = await prisma.bodyWeight.findMany({
    where: { userId },
    select: { id: true, weight: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
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
