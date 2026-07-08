import { WORKOUT_TYPES, WORKOUT_TYPE_LABEL, WORKOUT_TYPE_ICON, WORKOUT_TYPE_COLOR } from "@/lib/workout-types";
import { startSession } from "@/lib/actions";

export default function LoggaPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vilket pass kör du idag?</h1>
        <p className="mt-1 text-sm text-muted">Välj pass, sedan lägger du till övningarna du kör.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {WORKOUT_TYPES.map((wt) => {
          const Icon = WORKOUT_TYPE_ICON[wt];
          const color = WORKOUT_TYPE_COLOR[wt];
          return (
            <form key={wt} action={startSession}>
              <input type="hidden" name="workoutType" value={wt} />
              <button
                type="submit"
                className="flex w-full flex-col items-center gap-2.5 rounded-xl border border-border bg-surface p-5 text-center transition-colors hover:border-white/15 hover:bg-surface-hover active:scale-[0.98]"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `color-mix(in srgb, ${color.dark} 18%, transparent)`, color: color.dark }}
                >
                  <Icon size={24} strokeWidth={2.25} />
                </span>
                <span className="font-medium">{WORKOUT_TYPE_LABEL[wt]}</span>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
