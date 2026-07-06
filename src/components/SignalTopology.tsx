import { useMemo, useRef, useState } from "react";
import type { Overview } from "../lib/metrics";

const W = 1000;
const H = 150;
const PAD = 10;

type MetricKey = "LOAD" | "TIME" | "DIST" | "FITNESS" | "FORM";

interface MetricDef {
  key: MetricKey;
  title: string;
  unit: string;
  pool: "max" | "avg";
  min0: boolean;
  fmt: (v: number) => string;
  icon: JSX.Element;
}

const I = (d: string) => (
  <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const METRICS: MetricDef[] = [
  { key: "LOAD", title: "LOAD OUTPUT", unit: "TSS", pool: "max", min0: true, fmt: (v) => `${Math.round(v)}`, icon: I("M1 11 L4 5 L7 9 L10 2 L13 8") },
  {
    key: "TIME",
    title: "MOVING TIME",
    unit: "H",
    pool: "max",
    min0: true,
    fmt: (v) => v.toFixed(1),
    icon: (
      <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7.5" r="5.2" />
        <path d="M7 4.5 V7.5 L9.3 8.8" />
      </svg>
    ),
  },
  { key: "DIST", title: "DISTANCE", unit: "KM", pool: "max", min0: true, fmt: (v) => v.toFixed(1), icon: I("M1 7 H13 M3 5 L1 7 L3 9 M11 5 L13 7 L11 9") },
  { key: "FITNESS", title: "FITNESS CURVE", unit: "CTL", pool: "avg", min0: false, fmt: (v) => v.toFixed(1), icon: I("M1 11 L5 7 L8 9 L13 2 M13 2 V5 M13 2 H10") },
  { key: "FORM", title: "FORM BALANCE", unit: "TSB", pool: "avg", min0: false, fmt: (v) => (v > 0 ? `+${Math.round(v)}` : `${Math.round(v)}`), icon: I("M1 8 Q4 2 7 7 T13 6") },
];

type Series = { date: string; value: number }[];

function poolSeries(s: Series, n: number, mode: "max" | "avg"): Series {
  if (s.length <= n) return s;
  const out: Series = [];
  const size = s.length / n;
  for (let i = 0; i < n; i++) {
    const slice = s.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    if (!slice.length) continue;
    if (mode === "max") {
      let best = slice[0];
      for (const d of slice) if (d.value > best.value) best = d;
      out.push(best);
    } else {
      const avg = slice.reduce((a, d) => a + d.value, 0) / slice.length;
      out.push({ date: slice[Math.floor(slice.length / 2)].date, value: avg });
    }
  }
  return out;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z")
    .toLocaleDateString("en-US", { day: "2-digit", month: "short", timeZone: "UTC" })
    .toUpperCase();
}

export default function SignalTopology({ overview: o }: { overview: Overview }) {
  const [metric, setMetric] = useState<MetricKey>("LOAD");
  const [hover, setHover] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const def = METRICS.find((m) => m.key === metric)!;

  const { series, vmin, vmax, peak, mean, noise, pts } = useMemo(() => {
    let raw: Series;
    if (metric === "LOAD") raw = o.dailyLoad.map((d) => ({ date: d.date, value: d.load }));
    else if (metric === "TIME") raw = o.dailyLoad.map((d) => ({ date: d.date, value: d.hours }));
    else if (metric === "DIST") raw = o.dailyLoad.map((d) => ({ date: d.date, value: d.dist / 1000 }));
    else if (metric === "FITNESS") raw = o.fitnessSeries.map((p) => ({ date: p.date, value: p.ctl }));
    else raw = o.fitnessSeries.map((p) => ({ date: p.date, value: p.form }));

    const series = poolSeries(raw, 72, def.pool);
    const vals = series.map((s) => s.value);
    const dataMin = vals.length ? Math.min(...vals) : 0;
    const dataMax = vals.length ? Math.max(...vals) : 1;
    const vmin = def.min0 ? Math.min(0, dataMin) : dataMin;
    const vmax = dataMax;
    const range = vmax - vmin || 1;
    const peak = vals.length ? Math.max(...vals.map((v) => Math.abs(v))) : 0;
    const mean = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0;
    const std = vals.length ? Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) : 0;
    const ratio = std / range;
    const noise = ratio > 0.3 ? "HIGH" : ratio > 0.15 ? "MED" : "LOW";

    const pts = series
      .map((v, i) => {
        const x = PAD + (i / Math.max(1, series.length - 1)) * (W - PAD * 2);
        const y = H - PAD - ((v.value - vmin) / range) * (H - PAD * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return { series, vmin, vmax, peak, mean, noise, pts };
  }, [o, metric, def]);

  const n = series.length;
  const onMove = (e: React.MouseEvent) => {
    const el = boxRef.current;
    if (!el || n < 2) return;
    const rect = el.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(fx * (n - 1)))));
  };

  const range = (vmax - vmin) || 1;
  const hx = hover != null ? (hover / Math.max(1, n - 1)) * 100 : 0;
  const hy = hover != null ? (1 - (series[hover].value - vmin) / range) * 100 : 0;

  return (
    <section className="h-full flex flex-col">
      <div className="sec-h">
        <span>SIGNAL TOPOLOGY // {def.title}</span>
        <div className="flex items-center gap-1">
          {METRICS.map((m) => {
            const on = m.key === metric;
            return (
              <button
                key={m.key}
                onClick={() => {
                  setMetric(m.key);
                  setHover(null);
                }}
                aria-pressed={on}
                aria-label={`${m.key} (${m.unit})`}
                className={`group relative size-6 grid place-items-center border transition-colors ${
                  on ? "bg-ink text-paper border-ink" : "border-transparent text-dim hover:border-ink hover:text-ink"
                }`}
              >
                {m.icon}
                <span className="tipbox pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 z-40 whitespace-nowrap px-1.5 py-0.5 text-[11px] tracking-[0.04em] opacity-0 group-hover:opacity-100 transition-opacity">
                  {m.key} · {m.unit}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rule mt-2 mb-3" />

      <div ref={boxRef} className="border border-ink relative cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="170" preserveAspectRatio="none" className="block text-ink">
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1={PAD} x2={W - PAD} y1={H * g} y2={H * g} stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" opacity="0.45" />
          ))}
          {pts && <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.4" />}
        </svg>

        {hover != null && series[hover] && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 bottom-0 border-l border-dashed border-ink/50" style={{ left: `${hx}%` }} />
            <div className="absolute size-2 -translate-x-1/2 -translate-y-1/2 bg-ink rounded-full" style={{ left: `${hx}%`, top: `${hy}%` }} />
            <div
              className={`tipbox absolute -translate-x-1/2 ${hy < 28 ? "" : "-translate-y-full"} whitespace-nowrap px-2 py-1 text-[12px] uppercase tracking-[0.04em]`}
              style={{ left: `${Math.max(8, Math.min(92, hx))}%`, top: `${hy}%`, marginTop: hy < 28 ? 8 : -8 }}
            >
              {fmtDate(series[hover].date)} · <span className="hot">{def.fmt(series[hover].value)}</span> {def.unit}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-[12px] uppercase tracking-[0.04em] mt-2 text-dim">
        <span>AMP: <span className="hot text-ink">{def.fmt(peak)}</span> {def.unit}</span>
        <span>AVG: <span className="hot text-ink">{def.fmt(mean)}</span></span>
        <span>NOISE: <span className="hot text-ink">{noise}</span></span>
      </div>
    </section>
  );
}
