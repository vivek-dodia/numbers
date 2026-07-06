import type { Activity } from "../types";

function pid(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return "PID_" + h.toString(16).toUpperCase().padStart(4, "0");
}

// Map an activity to a printable ACTION mnemonic by type + intensity.
function action(a: Activity): string {
  const type = (a.type ?? "SESSION").replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase().slice(0, 12);
  const intensity = Number(a.icu_intensity) || 0;
  const kind = intensity >= 0.85 ? "INTERVAL" : intensity >= 0.7 ? "TEMPO" : intensity > 0 ? "ENDURANCE" : "LOGGED";
  return `${type}_${kind}`;
}

function stamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function EventLog({ activities }: { activities: Activity[] }) {
  const rows = [...activities]
    .filter((a) => (Number(a.moving_time || a.elapsed_time) || 0) >= 30 * 60) // 30+ min sessions
    .sort((a, b) => new Date(b.start_date_local ?? 0).getTime() - new Date(a.start_date_local ?? 0).getTime())
    .slice(0, 8);

  return (
    <section className="h-full flex flex-col">
      <div className="sec-h">
        <span>SYSTEM EVENT LOG</span>
        <span className="meta">≥30MIN</span>
      </div>
      <div className="rule mt-2 mb-3" />

      <div className="grid grid-cols-[104px_88px_1fr_52px_50px] gap-x-3 text-[12px]">
        <div className="uppercase tracking-[0.06em] text-dim pb-1">Timestamp</div>
        <div className="uppercase tracking-[0.06em] text-dim pb-1">Process ID</div>
        <div className="uppercase tracking-[0.06em] text-dim pb-1">Action</div>
        <div className="uppercase tracking-[0.06em] text-dim pb-1 text-right">Mins</div>
        <div className="uppercase tracking-[0.06em] text-dim pb-1 text-right">Code</div>

        {rows.map((a) => {
          const load = Number(a.icu_training_load) || 0;
          const hard = load >= 100;
          const mins = Math.round((Number(a.moving_time || a.elapsed_time) || 0) / 60);
          return (
            <div key={a.id} className="contents">
              <div className="tabular-nums py-[3px]">{stamp(a.start_date_local ?? "")}</div>
              <div className="py-[3px] text-dim">{pid(String(a.id))}</div>
              <div className={`py-[3px] truncate ${hard ? "hot" : ""}`}>{action(a)}</div>
              <div className="py-[3px] text-right tabular-nums">{mins}m</div>
              <div className={`py-[3px] text-right tabular-nums ${hard ? "hot" : "text-dim"}`}>x{load}</div>
            </div>
          );
        })}
      </div>
      {rows.length === 0 && <div className="text-dim py-6 text-center">LOG EMPTY</div>}
    </section>
  );
}
