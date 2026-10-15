import Link from "next/link";
import { Flame, Plus, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { getDashboardData, getWeightData } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { WeekActivity } from "@/components/week-activity";
import { StatTile } from "@/components/stat-tile";
import { formatWeight } from "@/lib/format";

export default async function Home() {
  const user = await requireUser();
  const [data, weight] = await Promise.all([getDashboardData(user.id), getWeightData(user.id)]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Översikt</h1>
      </div>

      <Link
        href="/logga"
        className="flex h-16 w-full items-center justify-center gap-2.5 rounded-xl bg-good text-lg font-semibold text-accent-foreground shadow-[0_0_28px_-6px_var(--good)] transition-transform hover:brightness-105 active:scale-[0.99]"
      >
        <Plus size={22} strokeWidth={2.5} />
        Starta nytt pass
      </Link>

      <WeekActivity days={data.weekActivity} weekNumber={data.weekNumber} />

      <section className="grid grid-cols-2 gap-3">
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
      </section>

      <Link
        href="/vikt"
        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-white/15 hover:bg-surface-hover active:bg-surface-hover"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Scale size={18} strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-xs text-muted sm:text-sm">Vikt</p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight">
              {weight.latest !== null ? `${formatWeight(weight.latest)} kg` : "Inget loggat än"}
            </p>
          </div>
        </div>
        {weight.weekChange !== null && weight.weekChange !== 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 text-right text-xs font-medium text-muted">
            {weight.weekChange > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {weight.weekChange > 0 ? "+" : ""}
            {formatWeight(weight.weekChange)} kg på 7 dagar
          </span>
        )}
      </Link>
    </div>
  );
}
