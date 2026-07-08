import Link from "next/link";
import { Trophy } from "lucide-react";
import { getTrendsData } from "@/lib/queries";
import { WORKOUT_TYPE_LABEL, WORKOUT_TYPE_COLOR } from "@/lib/workout-types";
import { formatVolume, formatWeight } from "@/lib/format";
import { VolumeChart } from "@/components/volume-chart";
import { BalanceChart } from "@/components/balance-chart";
import { StatTile } from "@/components/stat-tile";

const weekLabelFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });

export default async function TrenderPage() {
  const { buckets, balance, records } = await getTrendsData(12);

  const totalVolume = buckets.reduce((sum, b) => sum + b.volume, 0);
  const totalWorkouts = buckets.reduce((sum, b) => sum + b.workouts, 0);
  const avgWorkoutsPerWeek = (totalWorkouts / buckets.length).toFixed(1);
  const totalSets = balance.reduce((sum, b) => sum + b.sets, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trender</h1>
        <p className="mt-1 text-sm text-muted">Så har din träning utvecklats den senaste tiden.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Volym, 12 veckor" value={formatVolume(totalVolume)} />
        <StatTile label="Pass, 12 veckor" value={String(totalWorkouts)} hint={`${avgWorkoutsPerWeek} / vecka i snitt`} />
        <StatTile label="Set, senaste 30 dagarna" value={String(totalSets)} />
        <StatTile label="Personbästa loggade" value={String(records.length)} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Volym per vecka</h2>
        <VolumeChart
          data={buckets.map((b) => ({ weekLabel: weekLabelFmt.format(b.weekStart), volume: b.volume }))}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Balans mellan pass</h2>
        <p className="mb-3 text-sm text-muted">Antal set per pass, senaste 30 dagarna.</p>
        <BalanceChart data={balance.map(({ workoutType, sets }) => ({ workoutType, sets }))} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Personbästa</h2>
        {records.length === 0 ? (
          <p className="text-sm text-subtle">Inget loggat än.</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {records.map((r) => (
              <Link
                key={r.id}
                href={`/ovning/${r.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-center gap-2.5">
                  <Trophy size={15} style={{ color: WORKOUT_TYPE_COLOR[r.workoutType].dark }} />
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-subtle">{WORKOUT_TYPE_LABEL[r.workoutType]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-medium">
                    {formatWeight(r.weight)} kg × {r.reps}
                  </p>
                  <p className="font-mono text-xs text-subtle">~{r.est1RM} kg 1RM</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
