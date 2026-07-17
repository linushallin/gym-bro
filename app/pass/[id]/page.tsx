import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, Plus, Trash2, X } from "lucide-react";
import { getSessionDetail } from "@/lib/queries";
import { MUSCLE_GROUP_LABEL, MUSCLE_GROUP_ICON, MUSCLE_GROUP_COLOR, sessionLabel, sortGroups } from "@/lib/muscle-groups";
import { formatWeight, relativeDays } from "@/lib/format";
import { addSet, deleteSet, deleteEntry, addExerciseToSession, finishSession, deleteSession } from "@/lib/actions";
import { PrCard } from "@/components/pr-card";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

type SessionDetail = NonNullable<Awaited<ReturnType<typeof getSessionDetail>>>;
type Entry = SessionDetail["entries"][number];

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionDetail(id);
  if (!session) notFound();

  const label = sessionLabel(session.muscleGroups);
  const groups = sortGroups(session.muscleGroups);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={15} /> Översikt
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          {groups.map((group) => {
            const Icon = MUSCLE_GROUP_ICON[group];
            const color = MUSCLE_GROUP_COLOR[group];
            return (
              <span
                key={group}
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in srgb, ${color.dark} 18%, transparent)`, color: color.dark }}
              >
                <Icon size={22} strokeWidth={2.25} />
              </span>
            );
          })}
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{label}</h1>
          <p className="text-sm text-subtle">{relativeDays(session.createdAt)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {session.entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>

      {session.entries.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-subtle">
          Inga övningar tillagda än. Lägg till en nedan för att komma igång.
        </p>
      )}

      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="mb-3 text-sm font-medium">Lägg till övning</p>

        {session.availableExercises.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {session.availableExercises.map((ex) => (
              <form key={ex.id} action={addExerciseToSession}>
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="exerciseId" value={ex.id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-lg border border-border px-3.5 py-2.5 text-left text-sm transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="font-medium">{ex.name}</span>
                  {ex.previous ? (
                    <span className="font-mono text-xs text-subtle">
                      {ex.previous.sets.map((s) => `${formatWeight(s.weight)}×${s.reps}`).join(", ")}
                    </span>
                  ) : (
                    <span className="text-xs text-subtle">Ny övning</span>
                  )}
                </button>
              </form>
            ))}
          </div>
        )}

        <form action={addExerciseToSession} className="flex flex-wrap gap-2">
          <input type="hidden" name="sessionId" value={session.id} />
          <input
            type="text"
            name="name"
            required
            placeholder="Ny övning, t.ex. Bänkpress"
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-base outline-none focus:border-accent"
          />
          {groups.length > 1 && (
            <select
              name="muscleGroup"
              defaultValue={groups[0]}
              aria-label="Muskelgrupp"
              className="h-11 shrink-0 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-accent"
            >
              {groups.map((group) => (
                <option key={group} value={group}>
                  {MUSCLE_GROUP_LABEL[group]}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            <Plus size={16} strokeWidth={2.5} />
            Lägg till
          </button>
        </form>
      </div>

      <form action={finishSession}>
        <input type="hidden" name="id" value={session.id} />
        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-semibold hover:bg-surface-hover"
        >
          <Check size={16} />
          Klar med passet
        </button>
      </form>

      <form action={deleteSession} className="flex justify-center">
        <input type="hidden" name="id" value={session.id} />
        <ConfirmSubmitButton
          confirmMessage="Ta bort hela passet? Alla loggade set försvinner permanent."
          className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-subtle transition-colors hover:text-critical"
        >
          <Trash2 size={13} />
          Ta bort passet
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const lastSet = entry.sets[entry.sets.length - 1];
  const referenceSet = lastSet ?? entry.previous?.sets[entry.previous.sets.length - 1];

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link href={`/ovning/${entry.exerciseId}`} className="text-sm font-semibold hover:underline">
          {entry.exerciseName}
        </Link>
        {entry.sets.length === 0 && (
          <form action={deleteEntry}>
            <input type="hidden" name="id" value={entry.id} />
            <button
              type="submit"
              className="flex h-9 w-9 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-critical"
              aria-label="Ta bort övning"
            >
              <X size={15} />
            </button>
          </form>
        )}
      </div>

      {entry.pr && <PrCard pr={entry.pr} />}

      {entry.previous && (
        <div className="border-b border-border px-4 py-2 text-xs text-muted">
          Förra gången ({relativeDays(entry.previous.createdAt)}):{" "}
          {entry.previous.sets.map((s) => `${formatWeight(s.weight)}×${s.reps}`).join(", ")}
        </div>
      )}

      {entry.sets.length > 0 && (
        <ul className="divide-y divide-border">
          {entry.sets.map((s, i) => (
            <li key={s.id} className="flex items-center justify-between py-1 pl-4 pr-2">
              <span className="text-sm">
                <span className="text-subtle">Set {i + 1}</span>{" "}
                <span className="font-mono font-medium">
                  {formatWeight(s.weight)} kg × {s.reps}
                </span>
              </span>
              <form action={deleteSet}>
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  className="flex h-11 w-11 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-critical"
                  aria-label="Ta bort set"
                >
                  <Trash2 size={15} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addSet} className="p-3">
        <input type="hidden" name="sessionEntryId" value={entry.id} />
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">Vikt (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              name="weight"
              step="0.5"
              min="0"
              required
              defaultValue={referenceSet?.weight}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:border-accent"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs text-muted">Reps</span>
            <input
              type="number"
              inputMode="numeric"
              name="reps"
              step="1"
              min="1"
              required
              defaultValue={referenceSet?.reps}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            className="flex h-11 shrink-0 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            + Set
          </button>
        </div>
      </form>
    </div>
  );
}
