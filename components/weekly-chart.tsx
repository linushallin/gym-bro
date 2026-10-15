"use client";

import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatVolume } from "@/lib/format";

export type WeekPoint = {
  weekNumber: number;
  rangeLabel: string; // e.g. "13–19 okt"
  workouts: number;
  sets: number;
  volume: number;
};

type Metric = "workouts" | "sets" | "volume";

const METRICS: { key: Metric; label: string; format: (n: number) => string; explain: string }[] = [
  { key: "workouts", label: "Pass", format: (n) => `${n} pass`, explain: "Antal loggade pass per vecka." },
  { key: "sets", label: "Set", format: (n) => `${n} set`, explain: "Antal loggade set per vecka." },
  {
    key: "volume",
    label: "Volym",
    format: formatVolume,
    explain: "Total lyft vikt per vecka: vikt × reps, summerat över alla set.",
  },
];

export function WeeklyChart({ data }: { data: WeekPoint[] }) {
  const [metric, setMetric] = useState<Metric>("workouts");
  const [showTable, setShowTable] = useState(false);
  const active = METRICS.find((m) => m.key === metric)!;
  const hasData = data.some((d) => d.workouts > 0);
  const chartData = data.map((d) => ({ ...d, label: `v. ${d.weekNumber}` }));

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3 sm:px-4">
        <div role="tablist" aria-label="Mått" className="flex rounded-lg bg-background p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              role="tab"
              aria-selected={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={`h-9 rounded-md px-3.5 text-sm font-medium transition-colors ${
                metric === m.key ? "bg-surface-hover text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="h-9 rounded-md px-2 text-xs font-medium text-muted hover:text-foreground"
          aria-expanded={showTable}
        >
          {showTable ? "Visa diagram" : "Visa som tabell"}
        </button>
      </div>

      <p className="px-4 pt-3 text-xs text-subtle">{active.explain}</p>

      {!hasData ? (
        <div className="flex h-56 items-center justify-center text-sm text-subtle">Inga pass loggade i perioden.</div>
      ) : showTable ? (
        <div className="max-h-80 overflow-auto px-4 pb-4 pt-2">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
              <tr>
                <th className="py-2 font-medium">Vecka</th>
                <th className="py-2 text-right font-medium">Pass</th>
                <th className="py-2 text-right font-medium">Set</th>
                <th className="py-2 text-right font-medium">Volym</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {[...data].reverse().map((d) => (
                <tr key={d.weekNumber + d.rangeLabel}>
                  <td className="py-2">
                    v. {d.weekNumber} <span className="text-subtle">· {d.rangeLabel}</span>
                  </td>
                  <td className="py-2 text-right">{d.workouts}</td>
                  <td className="py-2 text-right">{d.sets}</td>
                  <td className="py-2 text-right">{formatVolume(d.volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64 px-2 pb-3 pt-2 sm:px-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid stroke="var(--border)" vertical={false} strokeWidth={1} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--subtle)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                minTickGap={12}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--subtle)" }}
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={false}
                tickFormatter={(v: number) => (metric === "volume" && v >= 1000 ? `${v / 1000}t` : String(v))}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-hover)" }}
                content={({ active: isActive, payload }) => {
                  const point = payload?.[0]?.payload as (WeekPoint & { label: string }) | undefined;
                  if (!isActive || !point) return null;
                  return (
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
                      <p className="text-sm font-semibold text-foreground">{active.format(point[metric])}</p>
                      <p className="mt-0.5 text-muted">
                        {point.label} · {point.rangeLabel}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey={metric} fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
