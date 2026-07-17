"use client";

import { useState } from "react";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, MUSCLE_GROUP_ICON, MUSCLE_GROUP_COLOR } from "@/lib/muscle-groups";
import { startSession } from "@/lib/actions";

export function MuscleGroupPicker() {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(group: string) {
    setSelected((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  return (
    <form action={startSession} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MUSCLE_GROUPS.map((group) => {
          const Icon = MUSCLE_GROUP_ICON[group];
          const color = MUSCLE_GROUP_COLOR[group];
          const isOn = selected.includes(group);
          return (
            <button
              key={group}
              type="button"
              onClick={() => toggle(group)}
              aria-pressed={isOn}
              className={`flex flex-col items-center gap-2.5 rounded-xl border p-5 text-center transition-colors active:scale-[0.98] ${
                isOn ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-white/15"
              }`}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in srgb, ${color.dark} 18%, transparent)`, color: color.dark }}
              >
                <Icon size={24} strokeWidth={2.25} />
              </span>
              <span className={`font-medium ${isOn ? "text-accent" : ""}`}>{MUSCLE_GROUP_LABEL[group]}</span>
            </button>
          );
        })}
      </div>

      {selected.map((group) => (
        <input key={group} type="hidden" name="muscleGroups" value={group} />
      ))}

      <button
        type="submit"
        disabled={selected.length === 0}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-good text-lg font-semibold text-accent-foreground shadow-[0_0_28px_-6px_var(--good)] transition-transform hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        Starta pass
      </button>
    </form>
  );
}
