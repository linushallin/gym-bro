"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

type Point = { date: string; weight: number };

const dateFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });
const kg = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");

export function WeightChart({ data }: { data: Point[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-border bg-surface text-sm text-subtle">
        Logga minst två vikter för att se din utveckling här.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 pl-2">
      <p className="mb-2 pl-2 text-xs text-subtle">Vikt i kg</p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => dateFmt.format(new Date(v))}
              stroke="var(--subtle)"
              tick={{ fontSize: 11, fill: "var(--subtle)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={24}
              padding={{ left: 8, right: 16 }}
            />
            <YAxis
              stroke="var(--subtle)"
              tick={{ fontSize: 11, fill: "var(--subtle)" }}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
              allowDecimals={false}
              tickFormatter={kg}
            />
            <Tooltip
              labelFormatter={(v) => dateFmt.format(new Date(v))}
              formatter={(value) => [`${kg(Number(value))} kg`, "Vikt"]}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              name="Vikt"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--accent)", strokeWidth: 2, stroke: "var(--surface)" }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
