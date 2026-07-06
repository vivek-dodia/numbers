import { motion } from "framer-motion";
import type { Activity } from "../types";
import { duration, km, int, relativeDay } from "../lib/format";

interface Props {
  activities: Activity[];
  colorMap: Record<string, string>;
}

export default function RecentActivities({ activities, colorMap }: Props) {
  const recent = [...activities]
    .sort((a, b) => new Date(b.start_date_local ?? 0).getTime() - new Date(a.start_date_local ?? 0).getTime())
    .slice(0, 12);

  return (
    <div className="panel pt-1 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-line pb-2.5 mb-3">
        <h3 className="font-display text-lg font-medium">Recent sessions</h3>
        <span className="eyebrow">{int(activities.length)} in range</span>
      </div>
      {recent.length === 0 ? (
        <div className="flex-1 grid place-items-center text-sm text-faint">Nothing logged yet</div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-x-8 flex-1 content-start">
          {recent.map((a, i) => {
            const color = colorMap[a.type ?? ""] ?? "var(--color-fitness)";
            const dist = Number(a.distance) || 0;
            const load = Number(a.icu_training_load) || 0;
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 + i * 0.03 }}
                className="flex items-center gap-3 py-2.5 border-b border-line"
              >
                <span className="size-8 rounded-lg shrink-0 grid place-items-center" style={{ background: `${color}1f` }}>
                  <span className="size-2 rounded-full" style={{ background: color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text truncate">{a.name || a.type}</div>
                  <div className="num text-xs text-faint">{relativeDay(a.start_date_local ?? "")}</div>
                </div>
                <div className="num text-right text-sm text-muted w-14 hidden md:block">
                  {dist > 0 ? `${km(dist)}` : "—"}
                </div>
                <div className="num text-right text-sm text-muted w-14">{duration(Number(a.moving_time || a.elapsed_time) || 0)}</div>
                <div className="num text-right text-sm w-10 text-fitness">{load ? int(load) : "—"}</div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
