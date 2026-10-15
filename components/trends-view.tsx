import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Trophy } from "lucide-react";
import type { PersonalRecord, TrendsData } from "@/lib/queries";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, MUSCLE_GROUP_COLOR } from "@/lib/muscle-groups";
import { formatDate, formatWeight } from "@/lib/format";
import { WeeklyChart } from "@/components/weekly-chart";

// One period scopes the whole page, so every number on it agrees.
export const PERIODS = [
  { weeks: 4, label: "4 v", long: "4 veckor" },
  { weeks: 12, label: "12 v", long: "12 veckor" },
  { weeks: 26, label: "6 mån", long: "6 månader" },
  { weeks: 52, label: "1 år", long: "1 år" },
] as const;
export const DEFAULT_WEEKS = 12;

export type Period = (typeof PERIODS)[number];

const dayMonthFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", timeZone: "UTC" });

function weekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const sameMonth = weekStart.getUTCMonth() === end.getUTCMonth();
  return `${sameMonth ? dayFmt.format(weekStart) : dayMonthFmt.format(weekStart)}–${dayMonthFmt.format(end)}`;
}

export function TrendsView({ period, data }: { period: Period; data: TrendsData }) {
  const { current, previous, buckets, balance, records } = data;

  const perWeek = (current.workouts / period.weeks).toFixed(1).replace(".", ",");
  const newRecords = records.filter((r) => r.date >= data.periodStart);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trender</h1>
          <p className="mt-1 text-sm text-muted">
            Senaste {period.long} jämfört med {period.long} innan.
          </p>
        </div>
        <nav aria-label="Period" className="flex self-start rounded-lg border border-border bg-surface p-0.5 sm:self-auto">
          {PERIODS.map((p) => {
            const selected = p.weeks === period.weeks;
            return (
              <Link
                key={p.weeks}
                href={p.weeks === DEFAULT_WEEKS ? "/trender" : `/trender?period=${p.weeks}`}
                aria-current={selected ? "page" : undefined}
                scroll={false}
                className={`flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                  selected ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <section aria-label="Sammanfattning" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile label="Pass" value={String(current.workouts)} hint={`${perWeek} per vecka`} now={current.workouts} before={previous.workouts} />
        <SummaryTile label="Set" value={String(current.sets)} now={current.sets} before={previous.sets} />
        <div className="col-span-2 rounded-xl border border-border bg-surface p-3.5 sm:col-span-1 sm:p-4">
          <p className="text-xs text-muted sm:text-sm">Nya personbästa</p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{newRecords.length}</p>
          <p className="mt-1 text-xs text-subtle">av {records.length} övningar totalt</p>
        </div>
      </section>

      <section>
        <SectionHeading title="Vecka för vecka" />
        <WeeklyChart
          data={buckets.map((b) => ({
            weekNumber: b.weekNumber,
            rangeLabel: weekRangeLabel(b.weekStart),
            workouts: b.workouts,
            sets: b.sets,
            volume: b.volume,
          }))}
        />
      </section>

      <section>
        <SectionHeading
          title="Muskelbalans"
          description="Andel av dina set per muskelgrupp. Jämnt fördelat = balanserad träning."
        />
        <MuscleBalance rows={balance} />
      </section>

      <section>
        <SectionHeading
          title="Personbästa"
          description="Tyngsta set per övning, genom tiderna. Beräknat 1RM = uppskattad maxvikt för en repetition."
        />
        <RecordsByGroup records={records} periodStart={data.periodStart} />
      </section>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  now,
  before,
}: {
  label: string;
  value: string;
  hint?: string;
  now: number;
  before: number;
}) {
  const change = before > 0 ? Math.round(((now - before) / before) * 100) : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 sm:p-4">
      <p className="text-xs text-muted sm:text-sm">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
      <p className="mt-1 flex items-center gap-0.5 text-xs text-muted">
        {change === null ? (
          <span className="text-subtle">Inget att jämföra med</span>
        ) : change === 0 ? (
          "Samma som förra perioden"
        ) : (
          <>
            {change > 0 ? <ArrowUpRight size={13} aria-hidden /> : <ArrowDownRight size={13} aria-hidden />}
            {change > 0 ? "+" : "−"}
            {Math.abs(change)} % mot förra perioden
          </>
        )}
      </p>
    </div>
  );
}

function MuscleBalance({ rows }: { rows: { muscleGroup: (typeof MUSCLE_GROUPS)[number]; sets: number }[] }) {
  const total = rows.reduce((sum, r) => sum + r.sets, 0);
  if (total === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-subtle">
        Inga set loggade i perioden.
      </p>
    );
  }

  const max = Math.max(...rows.map((r) => r.sets));
  const sorted = [...rows].sort((a, b) => b.sets - a.sets);

  return (
    <ul className="space-y-3 rounded-xl border border-border bg-surface p-4">
      {sorted.map((r) => {
        const share = Math.round((r.sets / total) * 100);
        return (
          <li key={r.muscleGroup} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-sm">
            <span className={r.sets === 0 ? "text-subtle" : "font-medium"}>{MUSCLE_GROUP_LABEL[r.muscleGroup]}</span>
            <span className="h-2 overflow-hidden rounded-full bg-background" aria-hidden>
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${(r.sets / max) * 100}%` }}
              />
            </span>
            <span className="w-28 text-right text-xs tabular-nums text-muted">
              {r.sets === 0 ? (
                "Inte tränad"
              ) : (
                <>
                  <span className="font-medium text-foreground">{r.sets} set</span> · {share} %
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RecordsByGroup({ records, periodStart }: { records: PersonalRecord[]; periodStart: Date }) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-subtle">
        Inga personbästa än. Logga ett pass så dyker de upp här.
      </p>
    );
  }

  const groups = MUSCLE_GROUPS.map((g) => ({ group: g, items: records.filter((r) => r.muscleGroup === g) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map(({ group, items }) => (
        <div key={group} className="rounded-xl border border-border bg-surface">
          <h3 className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MUSCLE_GROUP_COLOR[group].dark }} aria-hidden />
            {MUSCLE_GROUP_LABEL[group]}
            <span className="font-normal text-subtle">· {items.length}</span>
          </h3>
          <ul className="divide-y divide-border">
            {items.map((r) => {
              const isNew = r.date >= periodStart;
              return (
                <li key={r.id}>
                  <Link
                    href={`/ovning/${r.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        {r.name}
                        {isNew && (
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-good/15 px-1.5 py-0.5 text-[10px] font-semibold text-good">
                            <Trophy size={10} aria-hidden /> Nytt
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-subtle">{formatDate(r.date)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums">
                        {formatWeight(r.weight)} kg × {r.reps}
                      </p>
                      <p className="text-xs tabular-nums text-subtle">≈ {r.est1RM} kg 1RM</p>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-subtle" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
