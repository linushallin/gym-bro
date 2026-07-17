import { Minus } from "lucide-react";
import type { DayActivity } from "@/lib/queries";
import { MUSCLE_GROUP_LABEL, MUSCLE_GROUP_ICON, MUSCLE_GROUP_COLOR } from "@/lib/muscle-groups";
import { formatWeekday, daysSince } from "@/lib/format";

export function WeekActivity({ days, weekNumber }: { days: DayActivity[]; weekNumber: number }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Den här veckan</h2>
        <span className="text-xs font-medium text-subtle">Vecka {weekNumber}</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {days.map((day) => {
          const diff = daysSince(day.date);
          const isToday = diff === 0;
          const isFuture = diff < 0;
          const label = day.muscleGroups.map((g) => MUSCLE_GROUP_LABEL[g]).join(" / ");

          return (
            <div
              key={day.date.toISOString()}
              className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 text-center sm:p-2 ${
                isToday ? "border-accent/50 bg-accent/10" : "border-border bg-surface"
              } ${isFuture ? "opacity-40" : ""}`}
            >
              <span className={`text-[10px] font-medium sm:text-[11px] ${isToday ? "text-accent" : "text-subtle"}`}>
                {formatWeekday(day.date)} {day.date.getDate()}
              </span>

              {day.muscleGroups.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {day.muscleGroups.map((g) => {
                    const Icon = MUSCLE_GROUP_ICON[g];
                    const color = MUSCLE_GROUP_COLOR[g];
                    return (
                      <span
                        key={g}
                        className="flex h-7 w-7 items-center justify-center rounded-full sm:h-8 sm:w-8"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${color.dark} 22%, transparent)`,
                          color: color.dark,
                        }}
                      >
                        <Icon size={13} strokeWidth={2.25} />
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-subtle sm:h-8 sm:w-8">
                  <Minus size={12} />
                </span>
              )}

              <span className="line-clamp-2 text-[9px] font-medium leading-tight text-muted">
                {label || (isFuture ? "" : "Vila")}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
