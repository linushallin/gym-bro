"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

type Bucket = { weekLabel: string; volume: number };

export function VolumeChart({ data }: { data: Bucket[] }) {
  const hasData = data.some((d) => d.volume > 0);

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-border bg-surface text-sm text-subtle">
        Ingen volymdata ännu.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-xl border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap={4}>
          <CartesianGrid stroke="var(--border)" vertical={false} strokeWidth={1} />
          <XAxis
            dataKey="weekLabel"
            stroke="var(--subtle)"
            tick={{ fontSize: 11, fill: "var(--subtle)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={16}
          />
          <YAxis
            stroke="var(--subtle)"
            tick={{ fontSize: 11, fill: "var(--subtle)" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value) => [`${Math.round(Number(value))} kg`, "Volym"]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="volume" name="Volym" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
