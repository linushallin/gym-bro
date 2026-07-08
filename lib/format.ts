const dateFmt = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const weekdayFmt = new Intl.DateTimeFormat("sv-SE", { weekday: "short" });

export function formatDate(date: Date): string {
  return dateFmt.format(date);
}

export function formatWeekday(date: Date): string {
  const label = weekdayFmt.format(date).replace(/\.$/, "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDateTime(date: Date): string {
  return dateTimeFmt.format(date);
}

export function daysSince(date: Date, now: Date = new Date()): number {
  const startOfDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const ms = startOfDay(now) - startOfDay(date);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function relativeDays(date: Date | null | undefined, now: Date = new Date()): string {
  if (!date) return "Aldrig";
  const days = daysSince(date, now);
  if (days <= 0) return "Idag";
  if (days === 1) return "Igår";
  return `${days} dagar sedan`;
}

// Epley formula
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export function formatWeight(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1).replace(/\.0$/, "");
}

export function formatVolume(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")} ton`;
  return `${Math.round(n)} kg`;
}
