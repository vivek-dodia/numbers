import { useEffect, useState } from "react";
import { PERIODS } from "../lib/metrics";
import type { PeriodKey } from "../types";
import ThemeToggle from "./ThemeToggle";

function useClock(): string {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t.toISOString().slice(11, 19); // HH:MM:SS UTC
}

interface Props {
  session: string;
  loc: string;
  online: boolean;
  period: PeriodKey;
  onPeriod: (k: PeriodKey) => void;
}

export default function StatusBar({ session, loc, online, period, onPeriod }: Props) {
  const clock = useClock();
  return (
    <div className="uppercase tracking-[0.04em]">
      <div className="flex flex-wrap justify-between gap-y-1 py-2 text-[12px]">
        <span>SESSION: {session}</span>
        <span>LOC: {loc}</span>
        <span>
          STATUS: {online ? "ONLINE" : "OFFLINE"}
          <span className="ml-1 inline-block w-2 text-center animate-pulse">■</span>
        </span>
        <span>SYS_TIME: {clock} UTC</span>
      </div>
      <div className="rule" />
      <div className="flex items-center gap-2 py-2 text-[12px]">
        <span className="font-bold">RANGE:</span>
        {PERIODS.map((p) => {
          const on = p.key === period;
          return (
            <button
              key={p.key}
              onClick={() => onPeriod(p.key)}
              aria-pressed={on}
              className={`px-1.5 tracking-[0.08em] border border-transparent transition-colors ${
                on ? "bg-ink text-paper" : "hover:border-ink"
              }`}
            >
              [{p.key}]
            </button>
          );
        })}
        <ThemeToggle />
      </div>
    </div>
  );
}
