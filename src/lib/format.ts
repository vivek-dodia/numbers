// Display formatters. Distances are metric (km), matching intervals.icu.

export function km(meters: number, digits = meters >= 100_000 ? 0 : 1): string {
  return (meters / 1000).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function hours(seconds: number): string {
  const h = seconds / 3600;
  if (h >= 100) return Math.round(h).toLocaleString("en-US");
  return h.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Compact "12h 34m" style for a single duration.
export function duration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function int(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function signed(n: number, digits = 1): string {
  const s = n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return n > 0 ? `+${s}` : s;
}

export function compact(n: number): string {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const DAY = 86_400_000;
export function relativeDay(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
      DAY,
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
