import { useRef, useState } from "react";
import type { Activity } from "../types";

const COLS = 20;
const ROWS = 6;
const DAYS = COLS * ROWS; // last 120 days
const DAY = 86_400_000;
const WDNAME = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const wd = WDNAME[(d.getUTCDay() + 6) % 7];
  const md = d
    .toLocaleDateString("en-US", { day: "2-digit", month: "short", timeZone: "UTC" })
    .toUpperCase();
  return `${wd} ${md}`;
}

// Grayscale training-load calendar. Each cell = one day; darker = more load.
export default function SectorDensity({ activities }: { activities: Activity[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; below: boolean; date: string; load: number } | null>(null);

  const loadByDay = new Map<string, number>();
  for (const a of activities) {
    const k = new Date(a.start_date_local ?? 0).toISOString().slice(0, 10);
    loadByDay.set(k, (loadByDay.get(k) ?? 0) + (Number(a.icu_training_load) || 0));
  }

  const today = Date.now();
  const cells: { key: string; load: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today - i * DAY).toISOString().slice(0, 10);
    cells.push({ key: d, load: loadByDay.get(d) ?? 0 });
  }
  const peak = Math.max(1, ...cells.map((c) => c.load));

  // Ink at increasing opacity (empty = transparent) so cells blend with the
  // page/video background and re-skin with the theme.
  const shade = (load: number): string => {
    if (load <= 0) return "transparent";
    const t = Math.min(1, load / peak);
    const pct = [16, 34, 56, 78, 100][Math.ceil(t * 5) - 1] ?? 100;
    return `color-mix(in srgb, var(--color-ink) ${pct}%, transparent)`;
  };

  const onEnter = (e: React.MouseEvent, c: { key: string; load: number }) => {
    const grid = gridRef.current;
    if (!grid) return;
    const gr = grid.getBoundingClientRect();
    const cr = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = cr.left - gr.left + cr.width / 2;
    const below = cr.top - gr.top < 40; // top rows: drop tooltip below the cell
    const y = below ? cr.bottom - gr.top + 6 : cr.top - gr.top - 6;
    setHover({ x: cx, y, below, date: c.key, load: c.load });
  };

  return (
    <section className="h-full flex flex-col">
      <div className="sec-h">
        <span>NODE SECTOR DENSITY</span>
        <span className="meta">ACTV/IDLE</span>
      </div>
      <div className="rule mt-2 mb-3" />
      <div
        ref={gridRef}
        className="grid gap-[3px] relative"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHover(null)}
      >
        {cells.map((c) => (
          <div
            key={c.key}
            className="aspect-square cursor-help"
            style={{ background: shade(c.load) }}
            onMouseEnter={(e) => onEnter(e, c)}
          />
        ))}

        {hover && (
          <div
            className={`tipbox absolute -translate-x-1/2 ${hover.below ? "" : "-translate-y-full"} pointer-events-none z-40 whitespace-nowrap px-2 py-1 text-[12px] uppercase tracking-[0.04em]`}
            style={{ left: hover.x, top: hover.y }}
          >
            {fmtDate(hover.date)} ·{" "}
            {hover.load > 0 ? (
              <>
                <span className="hot">{Math.round(hover.load)}</span> TSS
              </>
            ) : (
              <span className="text-dim">IDLE</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
