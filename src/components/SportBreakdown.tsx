import { motion } from "framer-motion";
import type { SportSlice } from "../lib/metrics";
import { hours, km, int } from "../lib/format";

export default function SportBreakdown({ sports }: { sports: SportSlice[] }) {
  if (!sports.length) {
    return (
      <div className="panel p-6 grid place-items-center text-sm text-faint min-h-[220px]">
        No activities in this window
      </div>
    );
  }
  const top = sports.slice(0, 7);

  return (
    <div className="panel pt-1 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-line pb-2.5 mb-4">
        <h3 className="font-display text-lg font-medium">Sport mix</h3>
        <span className="eyebrow">by moving time</span>
      </div>

      {/* Stacked share bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink-2">
        {top.map((s) => (
          <motion.div
            key={s.type}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(1, s.share * 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ background: s.color }}
            title={`${s.label} · ${Math.round(s.share * 100)}%`}
          />
        ))}
      </div>

      <ul className="mt-5 flex-1 flex flex-col justify-around">
        {top.map((s, i) => (
          <motion.li
            key={s.type}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="flex items-center gap-3"
          >
            <span className="size-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="font-display text-sm w-24 shrink-0 truncate">{s.label}</span>
            <span className="num text-xs text-faint w-10 text-right">{int(s.count)}×</span>
            <div className="flex-1 h-px bg-line" />
            <span className="num text-sm text-muted w-16 text-right">{hours(s.movingS)}h</span>
            <span className="num text-sm text-text w-20 text-right">
              {s.distanceM > 0 ? `${km(s.distanceM)} km` : "—"}
            </span>
            <span className="num text-xs text-faint w-10 text-right">{Math.round(s.share * 100)}%</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
