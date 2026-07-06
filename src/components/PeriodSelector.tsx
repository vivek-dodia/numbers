import { motion } from "framer-motion";
import { PERIODS } from "../lib/metrics";
import type { PeriodKey } from "../types";

interface Props {
  active: PeriodKey;
  onChange: (k: PeriodKey) => void;
}

export default function PeriodSelector({ active, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex items-center gap-1 rounded-full border border-line bg-ink-2/70 p-1 backdrop-blur"
    >
      {PERIODS.map((p) => {
        const on = p.key === active;
        return (
          <button
            key={p.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(p.key)}
            className={`relative px-3.5 py-1.5 rounded-full text-sm font-medium font-display transition-colors
              ${on ? "text-ink" : "text-muted hover:text-text"}`}
          >
            {on && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-fitness to-form"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative num">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
