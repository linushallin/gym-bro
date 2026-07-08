import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 sm:p-4">
      <p className="text-xs text-muted sm:text-sm">{label}</p>
      <p className="mt-1.5 font-mono text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}
