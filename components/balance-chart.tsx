"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from "recharts";
import type { MuscleGroup } from "@prisma/client";
import { MUSCLE_GROUP_LABEL, MUSCLE_GROUP_COLOR } from "@/lib/muscle-groups";

type Row = { muscleGroup: MuscleGroup; sets: number };

export function BalanceChart({ data }: { data: Row[] }) {
  const hasData = data.some((d) => d.sets > 0);

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-border bg-surface text-sm text-subtle">
        Inga set loggade de senaste 30 dagarna.
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, label: MUSCLE_GROUP_LABEL[d.muscleGroup] }));

  return (
    <div className="h-80 rounded-xl border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 20, left: 4, bottom: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke="var(--border)" horizontal={false} strokeWidth={1} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            stroke="var(--subtle)"
            tick={{ fontSize: 10.5, fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
            width={102}
          />
          <Tooltip
            formatter={(value) => [`${value} set`, "Senaste 30 dagarna"]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="sets" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((entry) => (
              <Cell key={entry.muscleGroup} fill={MUSCLE_GROUP_COLOR[entry.muscleGroup].dark} />
            ))}
            <LabelList
              dataKey="sets"
              position="right"
              style={{ fill: "var(--muted)", fontSize: 11 }}
              formatter={(v) => (Number(v) > 0 ? v : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
