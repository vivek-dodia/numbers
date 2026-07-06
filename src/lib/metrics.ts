import type { Activity, PeriodKey, Wellness } from "../types";

export interface PeriodDef {
  key: PeriodKey;
  label: string;
  full: string;
  days: number | null; // null = all time
}

export const PERIODS: PeriodDef[] = [
  { key: "1D", label: "1D", full: "Today", days: 1 },
  { key: "1W", label: "1W", full: "This week", days: 7 },
  { key: "1M", label: "1M", full: "This month", days: 30 },
  { key: "3M", label: "3M", full: "3 months", days: 90 },
  { key: "1Y", label: "1Y", full: "This year", days: 365 },
  { key: "ALL", label: "ALL", full: "All time", days: null },
];

export interface SportSlice {
  type: string;
  label: string;
  color: string;
  count: number;
  distanceM: number;
  movingS: number;
  load: number;
  share: number; // 0..1 of moving time
}

export interface Bucket {
  key: string;
  label: string;
  load: number;
  hours: number;
}

export interface FitnessPoint {
  date: string;
  ctl: number;
  atl: number;
  form: number;
}

export interface Totals {
  activities: number;
  distanceM: number;
  movingS: number;
  elevationM: number;
  load: number;
  calories: number;
}

export interface Overview {
  from: Date;
  to: Date;
  days: number;
  weeks: number;
  totals: Totals;
  prev: Totals | null;
  sports: SportSlice[];
  fitness: { ctl: number; atl: number; form: number; ctlDelta: number } | null;
  fitnessSeries: FitnessPoint[];
  volume: Bucket[];
  volumeUnit: "day" | "week" | "month";
  dailyLoad: { date: string; load: number; hours: number; dist: number }[];
  longest: Activity | null;
  bestLoadDay: { date: string; load: number } | null;
  activeDays: number;
  streak: number;
}

const DAY = 86_400_000;

// ── Sport presentation ──────────────────────────────────────────────────────
const SPORT_COLORS: Record<string, string> = {
  Ride: "#3fd0e6",
  VirtualRide: "#5ad8ea",
  Run: "#b6f24a",
  VirtualRun: "#c7f56e",
  Swim: "#8b7bff",
  Walk: "#e8a838",
  Hike: "#f0a24b",
  WeightTraining: "#fb7185",
  Workout: "#ff9ea9",
  Rowing: "#4fd1b8",
  Yoga: "#e07be0",
};
const FALLBACK = ["#3fd0e6", "#b6f24a", "#8b7bff", "#e8a838", "#fb7185", "#4fd1b8", "#e07be0", "#f0a24b"];

function sportLabel(type: string): string {
  return type
    .replace(/^Virtual/, "e-")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function colorFor(type: string, index: number): string {
  return SPORT_COLORS[type] ?? FALLBACK[index % FALLBACK.length];
}

const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : 0);
const dateOf = (a: Activity): number => new Date(a.start_date_local ?? 0).getTime();
const dayKey = (t: number): string => new Date(t).toISOString().slice(0, 10);

function sumTotals(list: Activity[]): Totals {
  return list.reduce<Totals>(
    (acc, a) => {
      acc.activities += 1;
      acc.distanceM += num(a.distance);
      acc.movingS += num(a.moving_time || a.elapsed_time);
      acc.elevationM += num(a.total_elevation_gain);
      acc.load += num(a.icu_training_load);
      acc.calories += num(a.calories);
      return acc;
    },
    { activities: 0, distanceM: 0, movingS: 0, elevationM: 0, load: 0, calories: 0 },
  );
}

function bucketUnit(days: number): "day" | "week" | "month" {
  if (days <= 45) return "day";
  if (days <= 200) return "week";
  return "month";
}

function bucketLabel(t: number, unit: "day" | "week" | "month"): string {
  const d = new Date(t);
  if (unit === "day") return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  if (unit === "month") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function bucketKey(t: number, unit: "day" | "week" | "month"): string {
  const d = new Date(t);
  if (unit === "month") return `${d.getFullYear()}-${d.getMonth()}`;
  if (unit === "week") {
    const monday = new Date(t);
    const dow = (monday.getDay() + 6) % 7; // Mon=0
    monday.setDate(monday.getDate() - dow);
    return dayKey(monday.getTime());
  }
  return dayKey(t);
}

function buildVolume(list: Activity[], from: number, to: number, unit: "day" | "week" | "month"): Bucket[] {
  const map = new Map<string, Bucket>();
  // Seed empty buckets so gaps render as zero, not collapse.
  const step = unit === "day" ? DAY : unit === "week" ? DAY * 7 : DAY * 30;
  for (let t = from; t <= to + step; t += step) {
    const k = bucketKey(t, unit);
    if (!map.has(k)) map.set(k, { key: k, label: bucketLabel(t, unit), load: 0, hours: 0 });
  }
  for (const a of list) {
    const t = dateOf(a);
    const k = bucketKey(t, unit);
    const b = map.get(k) ?? { key: k, label: bucketLabel(t, unit), load: 0, hours: 0 };
    b.load += num(a.icu_training_load);
    b.hours += num(a.moving_time || a.elapsed_time) / 3600;
    map.set(k, b);
  }
  return [...map.values()].sort((x, y) => (x.key < y.key ? -1 : 1)).slice(-60);
}

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const stride = Math.ceil(arr.length / max);
  const out = arr.filter((_, i) => i % stride === 0);
  if (out[out.length - 1] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

export function computeOverview(
  activities: Activity[],
  wellness: Wellness[],
  period: PeriodDef,
): Overview {
  const now = Date.now();
  const earliest = activities.length ? Math.min(...activities.map(dateOf)) : now - 365 * DAY;
  const from = period.days == null ? earliest : now - period.days * DAY;
  const to = now;
  const days = Math.max(1, Math.round((to - from) / DAY));
  const weeks = Math.max(1, days / 7);

  const inRange = activities.filter((a) => {
    const t = dateOf(a);
    return t >= from && t <= to;
  });

  // Previous equal-length window for deltas (skip for all-time).
  let prev: Totals | null = null;
  if (period.days != null) {
    const prevFrom = from - period.days * DAY;
    const prevList = activities.filter((a) => {
      const t = dateOf(a);
      return t >= prevFrom && t < from;
    });
    prev = sumTotals(prevList);
  }

  // Sport breakdown by moving time share.
  const byType = new Map<string, Activity[]>();
  for (const a of inRange) {
    const t = a.type ?? "Other";
    (byType.get(t) ?? byType.set(t, []).get(t)!).push(a);
  }
  const totalMoving = inRange.reduce((s, a) => s + num(a.moving_time || a.elapsed_time), 0) || 1;
  const sports: SportSlice[] = [...byType.entries()]
    .map(([type, list], i) => {
      const t = sumTotals(list);
      return {
        type,
        label: sportLabel(type),
        color: colorFor(type, i),
        count: list.length,
        distanceM: t.distanceM,
        movingS: t.movingS,
        load: t.load,
        share: t.movingS / totalMoving,
      };
    })
    .sort((a, b) => b.movingS - a.movingS);
  // Re-assign colors by sorted order so the biggest sport gets the lead accent.
  sports.forEach((s, i) => (s.color = colorFor(s.type, i)));

  // Fitness curve from wellness (ctl/atl); form = ctl - atl (TSB).
  const wRange = wellness
    .filter((w) => {
      const t = new Date(w.id).getTime();
      return t >= from && t <= to;
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const fitnessSeries: FitnessPoint[] = downsample(
    wRange.map((w) => {
      const ctl = num(w.ctl);
      const atl = num(w.atl);
      return { date: w.id, ctl, atl, form: ctl - atl };
    }),
    420,
  );
  const lastW = wRange[wRange.length - 1];
  const firstW = wRange[0];
  const fitness =
    lastW != null
      ? {
          ctl: num(lastW.ctl),
          atl: num(lastW.atl),
          form: num(lastW.ctl) - num(lastW.atl),
          ctlDelta: num(lastW.ctl) - num(firstW?.ctl ?? lastW.ctl),
        }
      : null;

  const unit = bucketUnit(days);
  const volume = buildVolume(inRange, from, to, unit);

  // Per-day load/hours/distance across the whole range (zeros filled).
  const loadPerDay = new Map<string, number>();
  const hoursPerDay = new Map<string, number>();
  const distPerDay = new Map<string, number>();
  for (const a of inRange) {
    const k = dayKey(dateOf(a));
    loadPerDay.set(k, (loadPerDay.get(k) ?? 0) + num(a.icu_training_load));
    hoursPerDay.set(k, (hoursPerDay.get(k) ?? 0) + num(a.moving_time || a.elapsed_time) / 3600);
    distPerDay.set(k, (distPerDay.get(k) ?? 0) + num(a.distance));
  }
  const dailyLoad: { date: string; load: number; hours: number; dist: number }[] = [];
  for (let t = from; t <= to; t += DAY) {
    const k = dayKey(t);
    dailyLoad.push({ date: k, load: loadPerDay.get(k) ?? 0, hours: hoursPerDay.get(k) ?? 0, dist: distPerDay.get(k) ?? 0 });
  }

  const longest = inRange.reduce<Activity | null>(
    (best, a) => (num(a.distance) > num(best?.distance) ? a : best),
    null,
  );

  // Best single day by summed load.
  const loadByDay = new Map<string, number>();
  for (const a of inRange) {
    const k = dayKey(dateOf(a));
    loadByDay.set(k, (loadByDay.get(k) ?? 0) + num(a.icu_training_load));
  }
  let bestLoadDay: { date: string; load: number } | null = null;
  for (const [date, load] of loadByDay) {
    if (!bestLoadDay || load > bestLoadDay.load) bestLoadDay = { date, load };
  }

  // Consistency: active days in range + current streak counting back from today.
  const activeSet = new Set([...loadByDay.keys(), ...inRange.map((a) => dayKey(dateOf(a)))]);
  const activeDays = activeSet.size;
  let streak = 0;
  let firstDay = true;
  for (let t = now; ; t -= DAY) {
    if (activeSet.has(dayKey(t))) {
      streak += 1;
      firstDay = false;
    } else if (firstDay) {
      firstDay = false; // a rest day *today* shouldn't zero out a run of training
    } else {
      break;
    }
    if (t < now - 400 * DAY) break; // safety bound
  }

  return {
    from: new Date(from),
    to: new Date(to),
    days,
    weeks,
    totals: sumTotals(inRange),
    prev,
    sports,
    fitness,
    fitnessSeries,
    volume,
    volumeUnit: unit,
    dailyLoad,
    longest,
    bestLoadDay,
    activeDays,
    streak,
  };
}

export function pctDelta(now: number, was: number): number | null {
  if (!was) return null;
  return (now - was) / was;
}
