"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Minus, Plus } from "lucide-react";
import { addSet } from "@/lib/actions";

const WEIGHT_STEP = 2.5;
const REPS_STEP = 1;

function parse(value: string): number {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatInput(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")).replace(".", ",");
}

// Logging a set mid-workout, often one-handed and sweaty: big stepper buttons
// for the usual ±2,5 kg / ±1 rep tweaks, a keypad-friendly field for anything
// else, and values that stay put after submitting so the next set is one tap.
export function SetLogger({
  sessionEntryId,
  defaultWeight,
  defaultReps,
}: {
  sessionEntryId: string;
  defaultWeight?: number;
  defaultReps?: number;
}) {
  const [weight, setWeight] = useState(defaultWeight !== undefined ? formatInput(defaultWeight) : "");
  const [reps, setReps] = useState(defaultReps !== undefined ? String(defaultReps) : "");

  return (
    <form action={addSet} className="space-y-3 p-3">
      <input type="hidden" name="sessionEntryId" value={sessionEntryId} />
      <div className="grid grid-cols-2 gap-2.5">
        <Stepper
          label="Vikt (kg)"
          name="weight"
          value={weight}
          onChange={setWeight}
          inputMode="decimal"
          pattern="[0-9]+([.,][0-9]+)?"
          onStep={(dir) => setWeight(formatInput(Math.max(0, parse(weight) + dir * WEIGHT_STEP)))}
        />
        <Stepper
          label="Reps"
          name="reps"
          value={reps}
          onChange={setReps}
          inputMode="numeric"
          pattern="[0-9]+"
          onStep={(dir) => setReps(String(Math.max(1, Math.round(parse(reps)) + dir * REPS_STEP)))}
        />
      </div>
      <SubmitSetButton />
    </form>
  );
}

function Stepper({
  label,
  name,
  value,
  onChange,
  onStep,
  inputMode,
  pattern,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  onStep: (dir: 1 | -1) => void;
  inputMode: "decimal" | "numeric";
  pattern: string;
}) {
  const buttonClass =
    "flex w-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-foreground active:bg-surface-hover";
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <span className="flex h-12 overflow-hidden rounded-lg border border-border bg-background focus-within:border-accent">
        <button type="button" onClick={() => onStep(-1)} className={buttonClass} aria-label={`Minska ${label.toLowerCase()}`}>
          <Minus size={18} />
        </button>
        <input
          type="text"
          name={name}
          inputMode={inputMode}
          pattern={pattern}
          autoComplete="off"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-full min-w-0 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
        />
        <button type="button" onClick={() => onStep(1)} className={buttonClass} aria-label={`Öka ${label.toLowerCase()}`}>
          <Plus size={18} />
        </button>
      </span>
    </label>
  );
}

function SubmitSetButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover active:scale-[0.99] disabled:opacity-70"
    >
      {pending ? <LoaderCircle size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={2.5} />}
      Lägg till set
    </button>
  );
}
