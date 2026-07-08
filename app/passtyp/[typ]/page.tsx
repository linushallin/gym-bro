import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { getSessionHistory } from "@/lib/queries";
import { WORKOUT_TYPE_LABEL, WORKOUT_TYPE_ICON, WORKOUT_TYPE_COLOR, isWorkoutType } from "@/lib/workout-types";
import { formatDateTime, formatVolume, formatWeight } from "@/lib/format";
import { startSession, deleteSession } from "@/lib/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export default async function WorkoutTypePage({
  params,
}: {
  params: Promise<{ typ: string }>;
}) {
  const { typ } = await params;
  const workoutType = typ.toUpperCase();
  if (!isWorkoutType(workoutType)) notFound();

  const sessions = await getSessionHistory(workoutType);
  const label = WORKOUT_TYPE_LABEL[workoutType];
  const Icon = WORKOUT_TYPE_ICON[workoutType];
  const color = WORKOUT_TYPE_COLOR[workoutType];

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={15} /> Översikt
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
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{label}</h1>
            <p className="text-sm text-muted">{sessions.length} pass loggade</p>
          </div>
        </div>
        <form action={startSession}>
          <input type="hidden" name="workoutType" value={workoutType} />
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover sm:w-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            Logga
          </button>
        </form>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-subtle">
          Inget loggat än för {label.toLowerCase()}.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {sessions.map((s) => (
            <div key={s.id} className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
              <Link href={`/pass/${s.id}`} className="absolute inset-0" aria-label={formatDateTime(s.createdAt)} />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{formatDateTime(s.createdAt)}</p>
                <p className="mt-0.5 truncate text-xs text-subtle">
                  {s.exerciseNames.join(", ")}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted">
                <p>
                  {s.setCount} set · {formatVolume(s.volume)}
                </p>
                {s.top && (
                  <p className="text-subtle">
                    Topp {formatWeight(s.top.weight)} kg × {s.top.reps}
                  </p>
                )}
              </div>

              <form action={deleteSession} className="relative z-10 shrink-0">
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="workoutType" value={workoutType} />
                <ConfirmSubmitButton
                  confirmMessage="Ta bort det här passet? Alla loggade set försvinner permanent."
                  ariaLabel="Ta bort pass"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-critical"
                >
                  <Trash2 size={15} />
                </ConfirmSubmitButton>
              </form>

              <ChevronRight size={14} className="shrink-0 text-subtle" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
