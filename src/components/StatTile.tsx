import { motion } from "framer-motion";
import { useCountUp } from "../hooks/useCountUp";

export interface StatTileProps {
  label: string;
  value: number;
  format: (n: number) => string;
  unit?: string;
  sub?: string;
  delta?: number | null; // fractional change vs previous period
  accent?: string;
  index?: number;
}

export default function StatTile({
  label,
  value,
  format,
  unit,
  sub,
  delta,
  accent = "var(--color-fitness)",
  index = 0,
}: StatTileProps) {
  const v = useCountUp(value);
  const hasDelta = delta != null && isFinite(delta) && Math.abs(delta) >= 0.005;
  const up = (delta ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.05 }}
      className="relative pl-4 pr-2 py-1"
    >
      <span
        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between">
        <span className="eyebrow">{label}</span>
        {hasDelta && (
          <span
            className="num text-xs px-1.5 py-0.5 rounded-md"
            style={{
              color: up ? "var(--color-form)" : "var(--color-fatigue)",
              background: up ? "rgba(182,242,74,0.13)" : "rgba(251,113,133,0.13)",
            }}
          >
            {up ? "▲" : "▼"} {Math.abs(Math.round((delta ?? 0) * 100))}%
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="num text-4xl font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>
          {format(v)}
        </span>
        {unit && <span className="num text-sm text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-xs text-faint num">{sub}</div>}
    </motion.div>
  );
}
