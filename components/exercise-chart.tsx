"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Point = { date: string; topWeight: number; est1RM: number };

const dateFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });

export function ExerciseChart({ data }: { data: Point[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-border bg-surface text-sm text-subtle">
        Logga minst två pass för att se din utveckling här.
      </div>
    );
  }

  return (
    <div className="h-64 rounded-xl border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} strokeWidth={1} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => dateFmt.format(new Date(v))}
            stroke="var(--subtle)"
            tick={{ fontSize: 11, fill: "var(--subtle)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
          />
          <YAxis
            stroke="var(--subtle)"
            tick={{ fontSize: 11, fill: "var(--subtle)" }}
            tickLine={false}
            axisLine={false}
            width={36}
            unit=" kg"
          />
          <Tooltip
            labelFormatter={(v) => dateFmt.format(new Date(v))}
            formatter={(value, name) => [`${value} kg`, String(name)]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend
            iconType="line"
            wrapperStyle={{ fontSize: 12, color: "var(--muted)" }}
          />
          <Line
            type="monotone"
            dataKey="est1RM"
            name="Beräknat 1RM"
            stroke="var(--subtle)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--subtle)", strokeWidth: 0 }}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          />
          <Line
            type="monotone"
            dataKey="topWeight"
            name="Toppvikt"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--accent)", strokeWidth: 2, stroke: "var(--surface)" }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
