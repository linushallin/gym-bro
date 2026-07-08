import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus, Trophy } from "lucide-react";
import { getExerciseDetail } from "@/lib/queries";
import { WORKOUT_TYPE_LABEL, WORKOUT_TYPE_ICON, WORKOUT_TYPE_COLOR } from "@/lib/workout-types";
import { formatDateTime, formatWeight, formatVolume } from "@/lib/format";
import { ExerciseChart } from "@/components/exercise-chart";
import { startSessionForExercise } from "@/lib/actions";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = await getExerciseDetail(id);
  if (!exercise) notFound();

  const label = WORKOUT_TYPE_LABEL[exercise.workoutType];
  const Icon = WORKOUT_TYPE_ICON[exercise.workoutType];
  const color = WORKOUT_TYPE_COLOR[exercise.workoutType];

  return (
    <div className="space-y-6">
      <Link
        href={`/passtyp/${exercise.workoutType.toLowerCase()}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft size={15} /> {label}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `color-mix(in srgb, ${color.dark} 18%, transparent)`, color: color.dark }}
          >
            <Icon size={22} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{exercise.name}</h1>
            <p className="text-sm text-muted">{label}</p>
          </div>
        </div>
        <form action={startSessionForExercise}>
          <input type="hidden" name="exerciseId" value={exercise.id} />
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover sm:w-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            Logga
          </button>
        </form>
      </div>

      <section className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
          <p className="text-xs text-muted sm:text-sm">Personbästa</p>
          <p className="mt-1.5 font-mono text-lg font-semibold tracking-tight sm:text-xl">
            {exercise.pr ? `${formatWeight(exercise.pr.weight)} kg` : "–"}
          </p>
          {exercise.pr && <p className="text-xs text-subtle">× {exercise.pr.reps} reps</p>}
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
          <p className="text-xs text-muted sm:text-sm">Beräknat 1RM</p>
          <p className="mt-1.5 font-mono text-lg font-semibold tracking-tight sm:text-xl">{exercise.best1RM || "–"} kg</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
          <p className="text-xs text-muted sm:text-sm">Bästa volym/pass</p>
          <p className="mt-1.5 font-mono text-lg font-semibold tracking-tight sm:text-xl">{formatVolume(exercise.bestVolumeSession)}</p>
        </div>
      </section>

      <ExerciseChart
        data={exercise.chartData.map((d) => ({
          date: d.date.toISOString(),
          topWeight: d.topWeight,
          est1RM: d.est1RM,
        }))}
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Historik</h2>
        {exercise.sessions.length === 0 ? (
          <p className="text-sm text-subtle">Inget loggat än.</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {exercise.sessions.map((s) => {
              const isPR = exercise.pr && s.topWeight === exercise.pr.weight && s.createdAt.getTime() === exercise.pr.date.getTime();
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {formatDateTime(s.createdAt)}
                      {isPR && <Trophy size={13} className="text-good" />}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-subtle">
                      {s.sets.map((set) => `${formatWeight(set.weight)}×${set.reps}`).join(", ")}
                    </p>
                  </div>
                  <p className="font-mono text-xs text-muted">{formatVolume(s.volume)}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
