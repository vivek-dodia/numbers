import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Bucket } from "../lib/metrics";
import { int } from "../lib/format";

function Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload as Bucket;
  return (
    <div className="rounded-lg border border-line-strong bg-ink-2/95 px-3 py-2 text-xs backdrop-blur num shadow-xl">
      <div className="text-faint mb-1">{b.label}</div>
      <div className="text-fitness">{int(b.load)} load</div>
      <div className="text-muted">{b.hours.toFixed(1)} h</div>
    </div>
  );
}

export default function VolumeChart({ data, unit }: { data: Bucket[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.load));
  return (
    <div className="panel pt-1 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-line pb-2.5 mb-4">
        <h3 className="font-display text-lg font-medium">Training load</h3>
        <span className="eyebrow">per {unit}</span>
      </div>
      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} barCategoryGap={data.length > 30 ? 1 : 3}>
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-faint)", fontSize: 11, fontFamily: "IBM Plex Mono" }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              interval="preserveStartEnd"
            />
            <YAxis
              width={30}
              tick={{ fill: "var(--color-faint)", fontSize: 11, fontFamily: "IBM Plex Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="load" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d, i) => {
                const intensity = 0.4 + 0.6 * (d.load / max);
                return <Cell key={i} fill="var(--color-fitness)" fillOpacity={intensity} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
