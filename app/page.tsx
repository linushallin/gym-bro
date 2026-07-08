import Link from "next/link";
import { Flame, ChevronRight } from "lucide-react";
import { getDashboardData } from "@/lib/queries";
import { WORKOUT_TYPE_LABEL, WORKOUT_TYPE_ICON, WORKOUT_TYPE_COLOR } from "@/lib/workout-types";
import { WorkoutTypeCard } from "@/components/workout-type-card";
import { StatTile } from "@/components/stat-tile";
import { Delta } from "@/components/delta";
import { formatDateTime, formatVolume, formatWeight } from "@/lib/format";

export default async function Home() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Översikt</h1>
        <p className="mt-1 text-sm text-muted">Din träning, pass för pass.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Streak" value={`${data.streakDays} ${data.streakDays === 1 ? "dag" : "dagar"}`}>
          {data.streakDays > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-good">
              <Flame size={13} /> Fortsätt så!
            </span>
          )}
        </StatTile>
        <StatTile label="Pass denna vecka" value={String(data.workoutsThisWeek)}>
          <Delta current={data.workoutsThisWeek} previous={data.workoutsLastWeek} />
        </StatTile>
        <StatTile label="Volym denna vecka" value={formatVolume(data.volumeThisWeek)}>
          <Delta current={data.volumeThisWeek} previous={data.volumeLastWeek} />
        </StatTile>
        <StatTile label="Set denna vecka" value={String(data.setsThisWeek)} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Pass</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.types.map((summary) => (
            <WorkoutTypeCard key={summary.workoutType} summary={summary} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Senaste aktivitet</h2>
        {data.recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted">Inget loggat än. Kör ditt första pass!</p>
            <Link
              href="/logga"
              className="mt-3 inline-flex h-11 items-center gap-1 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Logga träning
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {data.recent.map((session) => {
              const Icon = WORKOUT_TYPE_ICON[session.workoutType];
              const color = WORKOUT_TYPE_COLOR[session.workoutType];
              return (
                <Link
                  key={session.id}
                  href={`/pass/${session.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${color.dark} 18%, transparent)`, color: color.dark }}
                  >
                    <Icon size={15} strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{session.exerciseNames.join(", ")}</p>
                    <p className="text-xs text-subtle">
                      {WORKOUT_TYPE_LABEL[session.workoutType]} · {formatDateTime(session.createdAt)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>
                      {session.setCount} set
                      {session.top && (
                        <>
                          {" · "}
                          {formatWeight(session.top.weight)} kg × {session.top.reps}
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-subtle" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
