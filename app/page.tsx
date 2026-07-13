import Link from "next/link";
import { Flame, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { getDashboardData, getWeightData } from "@/lib/queries";
import { WorkoutTypeCard } from "@/components/workout-type-card";
import { WeekActivity } from "@/components/week-activity";
import { StatTile } from "@/components/stat-tile";
import { formatVolume, formatWeight } from "@/lib/format";

export default async function Home() {
  const [data, weight] = await Promise.all([getDashboardData(), getWeightData()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Översikt</h1>
      </div>

      <WeekActivity days={data.weekActivity} weekNumber={data.weekNumber} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Streak"
          value={`${data.streakDays} ${data.streakDays === 1 ? "dag" : "dagar"}`}
        >
          {data.streakDays > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-good">
              <Flame size={13} /> Fortsätt så!
            </span>
          )}
        </StatTile>
        <StatTile label="Pass denna vecka" value={String(data.workoutsThisWeek)} />
        <StatTile label="Volym denna vecka" value={formatVolume(data.volumeThisWeek)} />
        <StatTile label="Set denna vecka" value={String(data.setsThisWeek)} />
      </section>

      <Link
        href="/vikt"
        className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-white/15 hover:bg-surface-hover"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Scale size={18} strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-xs text-muted sm:text-sm">Vikt</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight">
              {weight.latest !== null ? `${formatWeight(weight.latest)} kg` : "Inget loggat än"}
            </p>
          </div>
        </div>
        {weight.weekChange !== null && weight.weekChange !== 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
            {weight.weekChange > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {weight.weekChange > 0 ? "+" : ""}
            {formatWeight(weight.weekChange)} kg senaste 7 dagarna
          </span>
        )}
      </Link>

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
    </div>
  );
}
