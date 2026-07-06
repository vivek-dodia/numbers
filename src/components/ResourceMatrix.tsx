import type { Overview } from "../lib/metrics";
import { relativeDay } from "../lib/format";

// Sport mix rendered as capacity bars: solid black = share, dithered tail =
// headroom, right-aligned percentage.
export default function ResourceMatrix({ overview: o }: { overview: Overview }) {
  const rows = o.sports.slice(0, 6);

  return (
    <section className="h-full flex flex-col">
      <div className="sec-h">
        <span>RESOURCE MATRIX</span>
        <span className="meta">%_CAPACITY</span>
      </div>
      <div className="rule mt-2 mb-3" />

      <div className="space-y-[7px]">
        {rows.map((s, i) => {
          const pct = Math.round(s.share * 100);
          const fillW = pct; // bar length ≈ its capacity %
          const tailW = Math.min(14, 100 - fillW);
          const label = s.type.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase().slice(0, 10);
          const lead = i === 0; // dominant sport stands out
          return (
            <div key={s.type} className="flex items-center gap-3">
              <span className={`uppercase tracking-[0.06em] w-[84px] shrink-0 text-[12px] ${lead ? "hot" : "text-dim"}`}>
                {label}
              </span>
              <div className="flex-1 h-3.5 flex items-stretch">
                <div style={{ width: `${fillW}%` }} className="bg-ink" />
                <div style={{ width: `${tailW}%` }} className="dither" />
              </div>
              <span className={`v w-10 text-right tabular-nums ${lead ? "hot" : ""}`}>{pct}%</span>
            </div>
          );
        })}
        {rows.length === 0 && <div className="text-dim py-6 text-center">NO ACTIVITY IN RANGE</div>}
      </div>

      <div className="rule rule-faint my-3" />
      <div className="flex items-baseline justify-between text-[12px] uppercase tracking-[0.04em]">
        <span className="text-dim">
          {o.bestLoadDay
            ? `PEAK LOAD ${Math.round(o.bestLoadDay.load)} ON ${relativeDay(o.bestLoadDay.date).toUpperCase()}`
            : "NO PEAK RECORDED"}
        </span>
        <span className="font-bold">
          {o.fitness && o.fitness.form < -15 ? "*CRITICAL" : "*NOMINAL"}
        </span>
      </div>
    </section>
  );
}
