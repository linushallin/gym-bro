import { Flame } from "lucide-react";
import { getDashboardData } from "@/lib/queries";
import { WorkoutTypeCard } from "@/components/workout-type-card";
import { WeekActivity } from "@/components/week-activity";
import { StatTile } from "@/components/stat-tile";
import { Delta } from "@/components/delta";
import { formatVolume } from "@/lib/format";

export default async function Home() {
  const data = await getDashboardData();

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
        <StatTile
          label="Pass denna vecka"
          value={String(data.workoutsThisWeek)}
        >
          <Delta
            current={data.workoutsThisWeek}
            previous={data.workoutsLastWeek}
          />
        </StatTile>
        <StatTile
          label="Volym denna vecka"
          value={formatVolume(data.volumeThisWeek)}
        >
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
    </div>
  );
}
