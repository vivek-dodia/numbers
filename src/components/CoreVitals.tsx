import type { Overview } from "../lib/metrics";
import { hours, int, km, signed } from "../lib/format";

interface Row {
  k: string;
  v: string;
  up?: boolean | null;
  primary?: boolean; // weight bump
  hero?: boolean; // inverted stamp
  help: string;
}

export default function CoreVitals({ overview: o }: { overview: Overview }) {
  const f = o.fitness;
  const p = o.prev;
  const up = (now: number, was?: number) => (was == null ? null : now >= was);

  const rows: Row[] = [
    {
      k: "CTL_ATL",
      v: f ? `${f.ctl.toFixed(1)}, ${f.atl.toFixed(1)}` : "—",
      up: f ? f.ctlDelta >= 0 : null,
      primary: true,
      help: "Fitness vs fatigue: chronic training load (a 42-day average of your training stress) shown against acute load (a 7-day average). Fitness rising over fatigue means you're building form.",
    },
    {
      k: "FORM_TSB",
      v: f ? signed(f.form, 0) : "—",
      up: f ? f.form >= 0 : null,
      hero: true,
      help: "Training stress balance — fitness minus fatigue. A positive number means you're fresh and rested; a deep negative means you're carrying heavy fatigue and may need recovery.",
    },
    {
      k: "DISTANCE",
      v: `${km(o.totals.distanceM)} KM`,
      up: up(o.totals.distanceM, p?.distanceM),
      hero: true,
      help: "Total distance covered across every activity in the selected time range.",
    },
    {
      k: "MOVE_TIME",
      v: `${hours(o.totals.movingS)} H`,
      up: up(o.totals.movingS, p?.movingS),
      help: "Total moving time — the hours actually spent training in this range, with paused and idle time excluded.",
    },
    {
      k: "ELEV_GAIN",
      v: `${int(o.totals.elevationM)} M`,
      up: up(o.totals.elevationM, p?.elevationM),
      help: "Total vertical elevation climbed across all activities in the range, measured in metres.",
    },
    {
      k: "TRAIN_LOAD",
      v: `${int(o.totals.load)} TSS`,
      up: up(o.totals.load, p?.load),
      hero: true,
      help: "Total training load in this range, summed in TSS. It weights each session by how hard and how long it was — the overall stress your body absorbed.",
    },
    {
      k: "ACTIVE_CONN",
      v: int(o.totals.activities),
      up: up(o.totals.activities, p?.activities),
      help: "Number of recorded sessions (rides, runs, swims, workouts) logged in the selected range.",
    },
    {
      k: "ACTIVE_DAYS",
      v: `${int(o.activeDays)} / ${int(o.days)}`,
      hero: true,
      help: "Days with at least one activity, out of the total days in the range — a quick read on how consistent you've been.",
    },
    {
      k: "STREAK",
      v: `${int(o.streak)}d`,
      help: "Your current run of consecutive active days, counting back from today. A rest day today doesn't break it.",
    },
  ];

  return (
    <section className="h-full flex flex-col">
      <div className="sec-h">
        <span>CORE VITALS</span>
        <span className="meta">[CHK]</span>
      </div>
      <div className="rule mt-2 mb-3" />
      {rows.map((r) => (
        <div className="kv group relative cursor-help" key={r.k} tabIndex={0}>
          <span className={`k ${r.primary || r.hero ? "text-ink" : "text-dim"} ${r.up ? "underline underline-offset-2" : ""}`}>
            {r.k}
          </span>
          {r.hero ? (
            <span className="v hot-inv">{r.v}</span>
          ) : (
            <span className={`v ${r.primary ? "hot" : ""}`}>{r.v}</span>
          )}
          <span className="tip" role="tooltip">
            <span className="text-dim">&gt; </span>
            {r.help}
          </span>
        </div>
      ))}
    </section>
  );
}
