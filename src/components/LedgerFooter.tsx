import type { Overview } from "../lib/metrics";

// Deterministic pseudo-checksum from the window's headline numbers.
function checksum(o: Overview): string {
  const seed =
    Math.round(o.totals.distanceM) * 7 +
    Math.round(o.totals.load) * 13 +
    o.totals.activities * 31 +
    Math.round(o.totals.movingS);
  return (seed >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export default function LedgerFooter({ overview, activityCount }: { overview: Overview; activityCount: number }) {
  return (
    <footer className="text-center pt-4 pb-3">
      <div className="rule rule-faint mb-3" />
      <div className="text-[12px] uppercase tracking-[0.08em]">
        <span className="hot">NUMBERS</span> // END OF LEDGER // VERIFIED CHECKSUM:{" "}
        <span className="hot">0x{checksum(overview)}</span>
      </div>
      <div className="text-[11px] italic text-dim mt-1">
        {activityCount.toLocaleString("en-US")} RECORDS ON FILE · SYSTEM SECURE
      </div>
      <div className="text-[11px] text-dim mt-1 tracking-[0.04em]">
        opensource available at{" "}
        <a
          href="https://github.com/vivek-dodia/numbers"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-ink"
        >
          github.com/vivek-dodia/numbers
        </a>
      </div>
    </footer>
  );
}
