import { Trash2 } from "lucide-react";
import { getWeightData } from "@/lib/queries";
import { logWeight, deleteWeightEntry } from "@/lib/actions";
import { WeightChart } from "@/components/weight-chart";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { formatDateTime, formatWeight } from "@/lib/format";

export default async function ViktPage() {
  const { entries } = await getWeightData();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vikt</h1>
        <p className="mt-1 text-sm text-muted">Logga din vikt varje dag och se hur den utvecklas.</p>
      </div>

      <form action={logWeight} className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">Vikt idag (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              name="weight"
              step="0.1"
              min="0"
              required
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:border-accent"
              placeholder="t.ex. 82.4"
            />
          </label>
          <button
            type="submit"
            className="flex h-11 shrink-0 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Logga
          </button>
        </div>
      </form>

      <WeightChart data={[...entries].reverse().map((e) => ({ date: e.createdAt.toISOString(), weight: e.weight }))} />

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Historik</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-subtle">Inget loggat än.</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium">{formatDateTime(e.createdAt)}</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-muted">{formatWeight(e.weight)} kg</p>
                  <form action={deleteWeightEntry}>
                    <input type="hidden" name="id" value={e.id} />
                    <ConfirmSubmitButton
                      confirmMessage="Ta bort denna loggning?"
                      ariaLabel="Ta bort"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-critical"
                    >
                      <Trash2 size={15} />
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
