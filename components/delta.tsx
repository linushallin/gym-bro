import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function Delta({ current, previous, suffix = "" }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0 && current === 0) return null;

  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-good">
        <TrendingUp size={13} /> Nytt
      </span>
    );
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change);

  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-subtle">
        <Minus size={13} /> Oförändrat
      </span>
    );
  }

  const isUp = rounded > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isUp ? "text-good" : "text-critical"}`}>
      {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {isUp ? "+" : ""}
      {rounded}
      {suffix} mot förra veckan
    </span>
  );
}
