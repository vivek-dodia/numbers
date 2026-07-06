import type { Wellness } from "../types";
import { signed } from "../lib/format";

function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-10" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 100;
  const h = 40;
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const gid = `sg-${color.replace(/[^a-z]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Metric({
  label,
  unit,
  values,
  color,
  digits = 0,
}: {
  label: string;
  unit: string;
  values: number[];
  color: string;
  digits?: number;
}) {
  const clean = values.filter((v) => isFinite(v) && v !== 0);
  const latest = clean[clean.length - 1];
  const first = clean[0];
  const delta = latest != null && first != null ? latest - first : null;
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="w-24 shrink-0">
        <div className="eyebrow">{label}</div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="num text-2xl font-semibold" style={{ color }}>
            {latest != null ? latest.toFixed(digits) : "—"}
          </span>
          <span className="num text-xs text-faint">{unit}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <Spark values={clean.slice(-120)} color={color} />
      </div>
      {delta != null && Math.abs(delta) >= (digits ? 0.1 : 1) && (
        <span className="num text-xs w-12 text-right" style={{ color: "var(--color-muted)" }}>
          {signed(delta, digits)}
        </span>
      )}
    </div>
  );
}

export default function WellnessCard({ wellness }: { wellness: Wellness[] }) {
  const sorted = [...wellness].sort((a, b) => (a.id < b.id ? -1 : 1));
  const rhr = sorted.map((w) => Number(w.restingHR) || 0);
  const hrv = sorted.map((w) => Number(w.hrv) || 0);
  const weight = sorted.map((w) => Number(w.weight) || 0);

  const hasAny = [rhr, hrv, weight].some((s) => s.some((v) => v > 0));
  if (!hasAny) {
    return (
      <div className="panel p-6 grid place-items-center text-sm text-faint min-h-[140px]">
        No wellness metrics logged
      </div>
    );
  }

  return (
    <div className="panel pt-1 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-line pb-2.5 mb-2">
        <h3 className="font-display text-lg font-medium">Body</h3>
        <span className="eyebrow">wellness trend</span>
      </div>
      <div className="flex-1 flex flex-col justify-between divide-y divide-line">
        <Metric label="Resting HR" unit="bpm" values={rhr} color="var(--color-fatigue)" />
        <Metric label="HRV" unit="ms" values={hrv} color="var(--color-fitness)" />
        <Metric label="Weight" unit="kg" values={weight} color="var(--color-form)" digits={1} />
      </div>
    </div>
  );
}
