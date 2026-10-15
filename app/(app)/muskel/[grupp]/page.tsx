import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getSessionHistory } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import {
  MUSCLE_GROUP_LABEL,
  MUSCLE_GROUP_ICON,
  MUSCLE_GROUP_COLOR,
  isMuscleGroup,
  sessionLabel,
} from "@/lib/muscle-groups";
import { formatDateTime, formatVolume, formatWeight } from "@/lib/format";
import { startSession } from "@/lib/actions";

export default async function MuscleGroupPage({
  params,
}: {
  params: Promise<{ grupp: string }>;
}) {
  const { grupp } = await params;
  const group = grupp.toUpperCase();
  if (!isMuscleGroup(group)) notFound();

  const user = await requireUser();
  const sessions = await getSessionHistory(user.id, group);
  const label = MUSCLE_GROUP_LABEL[group];
  const Icon = MUSCLE_GROUP_ICON[group];
  const color = MUSCLE_GROUP_COLOR[group];

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft size={15} /> Översikt
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `color-mix(in srgb, ${color.dark} 18%, transparent)`, color: color.dark }}
          >
            <Icon size={22} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{label}</h1>
            <p className="text-sm text-muted">{sessions.length} pass loggade</p>
          </div>
        </div>
        <form action={startSession}>
          <input type="hidden" name="muscleGroups" value={group} />
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover sm:w-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            Logga pass
          </button>
        </form>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-subtle">
          Inget loggat än för {label.toLowerCase()}.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/pass/${s.id}`}
              className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover active:bg-surface-hover"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{formatDateTime(s.createdAt)}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{sessionLabel(s.muscleGroups)}</p>
                <p className="truncate text-xs text-subtle">{s.exerciseNames.join(", ")}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium tabular-nums">
                  {s.setCount} set <span className="font-normal text-muted">· {formatVolume(s.volume)}</span>
                </p>
                {s.top && (
                  <p className="mt-0.5 text-xs tabular-nums text-subtle">
                    Topp {formatWeight(s.top.weight)} kg × {s.top.reps}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="shrink-0 text-subtle" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
