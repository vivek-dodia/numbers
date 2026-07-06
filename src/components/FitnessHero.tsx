import { motion } from "framer-motion";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Overview } from "../lib/metrics";
import { signed } from "../lib/format";
import { useCountUp } from "../hooks/useCountUp";

function formState(form: number): { label: string; color: string } {
  if (form > 15) return { label: "Fresh", color: "var(--color-form)" };
  if (form > 5) return { label: "Rested", color: "var(--color-form)" };
  if (form > -10) return { label: "Neutral", color: "var(--color-gold)" };
  if (form > -25) return { label: "Building", color: "var(--color-fatigue)" };
  return { label: "Deep fatigue", color: "var(--color-fatigue)" };
}

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = Object.fromEntries(payload.map((x: any) => [x.dataKey, x.value]));
  return (
    <div className="rounded-lg border border-line-strong bg-ink-2/95 px-3 py-2 text-xs backdrop-blur num shadow-xl">
      <div className="text-faint mb-1">{new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
      <Row c="var(--color-fitness)" k="Fitness" v={p.ctl} />
      <Row c="var(--color-fatigue)" k="Fatigue" v={p.atl} />
      <Row c="var(--color-form)" k="Form" v={p.form} sign />
    </div>
  );
}
function Row({ c, k, v, sign }: { c: string; k: string; v: number; sign?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="size-2 rounded-full" style={{ background: c }} />
      <span className="text-muted w-14">{k}</span>
      <span className="text-text">{sign ? signed(v ?? 0, 0) : Math.round(v ?? 0)}</span>
    </div>
  );
}

function Readout({ label, value, color, sign }: { label: string; value: number; color: string; sign?: boolean }) {
  const v = useCountUp(value);
  return (
    <div>
      <div className="eyebrow" style={{ color }}>
        {label}
      </div>
      <div className="num text-3xl md:text-4xl font-semibold leading-none mt-1" style={{ color }}>
        {sign ? signed(v, 0) : Math.round(v)}
      </div>
    </div>
  );
}

export default function FitnessHero({ overview, periodFull }: { overview: Overview; periodFull: string }) {
  const f = overview.fitness;
  const state = f ? formState(f.form) : null;
  const bigCtl = useCountUp(f?.ctl ?? 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="panel relative overflow-hidden h-full"
    >
      <div className="relative z-10 grid lg:grid-cols-[minmax(0,1fr)_2fr] gap-6 p-6 md:p-8">
        {/* Readout column */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="eyebrow mb-2">Fitness · {periodFull}</div>
            <div className="flex items-end gap-3">
              <span className="num text-7xl md:text-8xl font-bold leading-[0.85] text-fitness">
                {Math.round(bigCtl)}
              </span>
              {f && (
                <span
                  className="num text-sm mb-2 px-2 py-0.5 rounded-full border"
                  style={{
                    color: f.ctlDelta >= 0 ? "var(--color-form)" : "var(--color-fatigue)",
                    borderColor: "var(--color-line-strong)",
                  }}
                >
                  {signed(f.ctlDelta, 0)} CTL
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-muted max-w-xs">
              Chronic Training Load — your rolling fitness. The band shows fatigue riding
              underneath and form as the gap between them.
            </p>
          </div>

          {f && state && (
            <div className="mt-6 flex items-center gap-6">
              <Readout label="Fatigue" value={f.atl} color="var(--color-fatigue)" />
              <Readout label="Form" value={f.form} color={state.color} sign />
              <div className="ml-auto text-right">
                <div className="eyebrow">Status</div>
                <div className="font-display text-lg font-medium mt-1" style={{ color: state.color }}>
                  {state.label}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Curve */}
        <div className="h-56 md:h-64 -mr-2">
          {overview.fitnessSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={overview.fitnessSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="ctlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-fitness)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--color-fitness)" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="atlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-fatigue)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--color-fatigue)" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-line)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  tick={{ fill: "var(--color-faint)", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={48}
                />
                <YAxis
                  width={30}
                  tick={{ fill: "var(--color-faint)", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<Tip />} cursor={{ stroke: "var(--color-line-strong)" }} />
                <Area type="monotone" dataKey="atl" stroke="var(--color-fatigue)" strokeWidth={1.5} strokeOpacity={0.7} fill="url(#atlFill)" isAnimationActive={false} dot={false} />
                <Area type="monotone" dataKey="ctl" stroke="var(--color-fitness)" strokeWidth={2.5} fill="url(#ctlFill)" isAnimationActive={false} dot={false} />
                <Line type="monotone" dataKey="form" stroke="var(--color-form)" strokeWidth={1.5} strokeOpacity={0.85} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-faint">
              No wellness data in this window
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
