import { motion } from "framer-motion";
import type { Overview } from "../lib/metrics";
import { duration, int, km, relativeDay } from "../lib/format";

function Row({
  accent,
  label,
  value,
  unit,
  sub,
  i,
}: {
  accent: string;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  i: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + i * 0.06 }}
      className="relative flex items-center gap-3 py-3.5"
    >
      <span className="h-8 w-1 rounded-full shrink-0" style={{ background: accent }} />
      <div className="min-w-0">
        <div className="eyebrow">{label}</div>
        {sub && <div className="num text-xs text-faint mt-0.5">{sub}</div>}
      </div>
      <div className="ml-auto flex items-baseline gap-1">
        <span className="num text-2xl font-semibold" style={{ color: accent }}>
          {value}
        </span>
        {unit && <span className="num text-xs text-muted">{unit}</span>}
      </div>
    </motion.div>
  );
}

export default function Highlights({ overview }: { overview: Overview }) {
  const o = overview;
  const perWeek = o.totals.activities / o.weeks;
  const consistency = Math.round((o.activeDays / o.days) * 100);
  const longestDist = Number(o.longest?.distance) || 0;

  return (
    <div className="panel pt-1 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-line pb-2.5 mb-1">
        <h3 className="font-display text-lg font-medium">Highlights</h3>
        <span className="eyebrow">this window</span>
      </div>
      <div className="flex-1 flex flex-col justify-between divide-y divide-line">
        <Row
          i={0}
          accent="var(--color-fitness)"
          label="Longest session"
          sub={o.longest ? o.longest.name || o.longest.type || "" : "—"}
          value={longestDist > 0 ? km(longestDist) : o.longest ? duration(Number(o.longest.moving_time) || 0) : "—"}
          unit={longestDist > 0 ? "km" : ""}
        />
        <Row
          i={1}
          accent="var(--color-fatigue)"
          label="Biggest day"
          sub={o.bestLoadDay ? relativeDay(o.bestLoadDay.date) : "—"}
          value={o.bestLoadDay ? int(o.bestLoadDay.load) : "—"}
          unit="TSS"
        />
        <Row
          i={2}
          accent="var(--color-form)"
          label="Current streak"
          sub="consecutive active days"
          value={int(o.streak)}
          unit="days"
        />
        <Row
          i={3}
          accent="var(--color-gold)"
          label="Consistency"
          sub={`${int(o.activeDays)} of ${int(o.days)} days active`}
          value={`${consistency}`}
          unit="%"
        />
        <Row
          i={4}
          accent="#f0a24b"
          label="Weekly rhythm"
          sub="sessions per week"
          value={perWeek.toFixed(1)}
          unit="/ wk"
        />
      </div>
    </div>
  );
}
