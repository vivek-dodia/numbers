import type { Activity, Wellness } from "../types";

// Deterministic synthetic season so the UI can be previewed without a login.
// A tiny seeded PRNG keeps runs stable (no Math.random → same demo every load).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;

const PLAN = [
  { type: "Ride", weight: 0.42, distKm: [30, 120], hrs: [1, 4.5], base: 55 },
  { type: "Run", weight: 0.3, distKm: [5, 22], hrs: [0.5, 2], base: 45 },
  { type: "Swim", weight: 0.1, distKm: [1.5, 4], hrs: [0.5, 1.2], base: 35 },
  { type: "WeightTraining", weight: 0.12, distKm: [0, 0], hrs: [0.5, 1], base: 30 },
  { type: "Walk", weight: 0.06, distKm: [3, 8], hrs: [0.5, 1.5], base: 12 },
];

function pick(rnd: () => number) {
  let r = rnd();
  for (const p of PLAN) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return PLAN[0];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function buildDemoData(years = 3): { activities: Activity[]; wellness: Wellness[] } {
  const rnd = mulberry32(20260703);
  const activities: Activity[] = [];
  const wellness: Wellness[] = [];
  const start = Date.now() - years * 365 * DAY;
  const totalDays = years * 365;

  let ctl = 32;
  let atl = 30;
  let id = 100000;

  for (let d = 0; d <= totalDays; d++) {
    const t = start + d * DAY;
    const date = new Date(t);
    const season = 0.5 + 0.5 * Math.sin((d / 365) * Math.PI * 2 - Math.PI / 2); // yearly build
    const progress = d / totalDays; // long-term upward trend
    const dow = date.getDay();

    // Training density: more on weekends, ramps with the season.
    const pTrain = 0.35 + season * 0.4 + (dow === 0 || dow === 6 ? 0.2 : 0) + progress * 0.05;
    let dayLoad = 0;

    if (rnd() < pTrain) {
      const sessions = rnd() < 0.15 + season * 0.15 ? 2 : 1;
      for (let s = 0; s < sessions; s++) {
        const plan = pick(rnd);
        const hrs = lerp(plan.hrs[0], plan.hrs[1], rnd() * (0.6 + season * 0.4));
        const movingS = Math.round(hrs * 3600);
        const distanceM = plan.distKm[1] > 0 ? Math.round(lerp(plan.distKm[0], plan.distKm[1], rnd() * (0.5 + season * 0.5)) * 1000) : 0;
        const load = Math.round(plan.base * hrs * (0.7 + rnd() * 0.7) * (0.8 + season * 0.4));
        dayLoad += load;
        const avgHr = Math.round(lerp(118, 158, rnd()));
        activities.push({
          id: `demo-${id++}`,
          name: `${plan.type === "WeightTraining" ? "Strength" : plan.type} · ${date.toLocaleDateString("en-US", { weekday: "long" })}`,
          type: plan.type,
          start_date_local: new Date(t + 7 * 3600_000 + s * 3600_000).toISOString().slice(0, 19),
          moving_time: movingS,
          elapsed_time: movingS + Math.round(rnd() * 600),
          distance: distanceM,
          total_elevation_gain: plan.type === "Ride" ? Math.round(distanceM * lerp(0.005, 0.02, rnd())) : Math.round(distanceM * 0.008),
          icu_training_load: load,
          icu_intensity: Math.round((0.55 + rnd() * 0.35) * 100) / 100,
          average_heartrate: avgHr,
          max_heartrate: avgHr + Math.round(10 + rnd() * 25),
          icu_average_watts: plan.type === "Ride" ? Math.round(lerp(150, 280, rnd())) : undefined,
          calories: Math.round(hrs * lerp(500, 850, rnd())),
        });
      }
    }

    // Fitness model: CTL/ATL exponential smoothing on daily load.
    atl = atl + (dayLoad - atl) / 7;
    ctl = ctl + (dayLoad - ctl) / 42;
    wellness.push({
      id: new Date(t).toISOString().slice(0, 10),
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      restingHR: Math.round(lerp(52, 46, progress) + (rnd() - 0.5) * 4),
      hrv: Math.round(lerp(58, 82, progress) + (rnd() - 0.5) * 12),
      weight: Math.round((lerp(75, 71.5, progress) + (rnd() - 0.5) * 0.8) * 10) / 10,
    });
  }

  return { activities, wellness };
}
