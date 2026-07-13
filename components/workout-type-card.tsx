import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import type { WorkoutTypeSummary } from "@/lib/queries";
import { WORKOUT_TYPE_LABEL, WORKOUT_TYPE_ICON, WORKOUT_TYPE_COLOR } from "@/lib/workout-types";
import { relativeDays, formatWeight } from "@/lib/format";
import { startSession } from "@/lib/actions";

export function WorkoutTypeCard({ summary }: { summary: WorkoutTypeSummary }) {
  const { workoutType, lastSession } = summary;
  const label = WORKOUT_TYPE_LABEL[workoutType];
  const Icon = WORKOUT_TYPE_ICON[workoutType];
  const color = WORKOUT_TYPE_COLOR[workoutType];

  return (
    <div className="group relative rounded-xl border border-border bg-surface p-4 transition-colors hover:border-white/15 hover:bg-surface-hover">
      <Link href={`/passtyp/${workoutType.toLowerCase()}`} className="absolute inset-0" aria-label={label} />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${color.dark} 18%, transparent)`, color: color.dark }}
          >
            <Icon size={18} strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="font-semibold leading-tight">{label}</h3>
            <p className="text-xs text-subtle">{summary.exerciseCount} övningar</p>
          </div>
        </div>

        <form action={startSession} className="relative z-10">
          <input type="hidden" name="workoutType" value={workoutType} />
          <button
            type="submit"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent"
            aria-label={`Logga ${label}`}
          >
            <Plus size={16} />
          </button>
        </form>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        {lastSession ? (
          <>
            <p className="truncate text-sm font-medium">{lastSession.exerciseNames.join(", ")}</p>
            <div className="mt-0.5 flex items-center justify-between">
              <p className="text-xs text-subtle">
                {relativeDays(lastSession.createdAt)}
                {lastSession.top && (
                  <>
                    {" · "}
                    {formatWeight(lastSession.top.weight)} kg × {lastSession.top.reps}
                  </>
                )}
              </p>
              <ChevronRight size={14} className="text-subtle transition-transform group-hover:translate-x-0.5" />
            </div>
          </>
        ) : (
          <p className="text-sm text-subtle">Inget loggat än</p>
        )}
      </div>
    </div>
  );
}
