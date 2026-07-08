import { Trophy } from "lucide-react";
import { formatWeight, relativeDays, estimate1RM } from "@/lib/format";

const GOLD = "#facc15";

export function PrCard({ pr }: { pr: { weight: number; reps: number; date: Date } }) {
  const est1RM = Math.round(estimate1RM(pr.weight, pr.reps));

  return (
    <div
      className="relative mx-3 mb-1 mt-3 overflow-hidden rounded-xl border p-3"
      style={{
        borderColor: `color-mix(in srgb, ${GOLD} 35%, transparent)`,
        backgroundImage: `radial-gradient(ellipse 220px 120px at 0% 0%, color-mix(in srgb, ${GOLD} 20%, transparent), transparent)`,
        backgroundColor: `color-mix(in srgb, ${GOLD} 5%, var(--surface))`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in srgb, ${GOLD} 22%, transparent)`, color: GOLD }}
        >
          <Trophy size={19} strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: GOLD }}>
            Personbästa
          </p>
          <p className="font-mono text-xl font-bold leading-tight tracking-tight">
            {formatWeight(pr.weight)} kg <span className="text-sm font-medium text-subtle">× {pr.reps}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-subtle">{relativeDays(pr.date)}</p>
          <p className="mt-0.5 font-mono text-xs text-subtle">~{est1RM} kg 1RM</p>
        </div>
      </div>
    </div>
  );
}
