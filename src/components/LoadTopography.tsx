import { useEffect, useMemo, useRef, useState } from "react";
import type { Overview } from "../lib/metrics";

const DAY = 86_400_000;
const WD = 7;
const MAXCOL = 48;
const WDNAME = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Model-space proportions (fit handles absolute scale)
const AX = 1.7; // week axis spread
const AY = 1.0; // weekday axis spread
const AZ = 0.62; // height

const SHADES = ["#cccccc", "#a6a6a6", "#808080", "#5a5a5a", "#333333", "#0a0a0a"];

// Default viewpoint + a readable orbit envelope so it can't flatten out or
// spin around backwards.
const AZ0 = -0.62;
const EL0 = 1.0;
const AZ_MIN = AZ0 - 1.15; // ±~66° of yaw
const AZ_MAX = AZ0 + 1.15;
const EL_MIN = 0.42; // ~24° — still safely off edge-on
const EL_MAX = 1.42; // ~81° — near top-down
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type Grid = number[][];

function boxBlur(g: Grid): Grid {
  const C = g.length;
  const R = g[0].length;
  const out: Grid = Array.from({ length: C }, () => new Array(R).fill(0));
  for (let i = 0; i < C; i++)
    for (let j = 0; j < R; j++) {
      let sum = 0;
      let wsum = 0;
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++) {
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= C || jj >= R) continue;
          const w = di === 0 && dj === 0 ? 3 : 1;
          sum += g[ii][jj] * w;
          wsum += w;
        }
      out[i][j] = sum / wsum;
    }
  return out;
}

function bilinear(g: Grid, bi: number, bj: number): number {
  const C = g.length;
  const R = g[0].length;
  const i0 = Math.floor(bi);
  const j0 = Math.floor(bj);
  const i1 = Math.min(C - 1, i0 + 1);
  const j1 = Math.min(R - 1, j0 + 1);
  const fi = bi - i0;
  const fj = bj - j0;
  const a = g[i0][j0] * (1 - fi) + g[i1][j0] * fi;
  const b = g[i0][j1] * (1 - fi) + g[i1][j1] * fi;
  return a * (1 - fj) + b * fj;
}

interface Vert {
  x: number;
  y: number;
  z: number;
}
interface Model {
  verts: Vert[]; // upsampled mesh vertices
  segs: [number, number, number][]; // [a, b, shadeLevel]
  floorSegs: [number, number][];
  picks: { x: number; y: number; z: number; date: string; wd: number; load: number }[];
  peak: number;
  weeks: number;
}

function buildModel(overview: Overview): Model {
  const empty: Model = { verts: [], segs: [], floorSegs: [], picks: [], peak: 0, weeks: 0 };
  const daily = overview.dailyLoad;
  if (daily.length === 0) return empty;

  const firstMs = Date.parse(daily[0].date + "T00:00:00Z");
  const dow0 = (new Date(firstMs).getUTCDay() + 6) % 7;
  const mondayMs = firstMs - dow0 * DAY;
  let weeksN = 0;
  const raw: number[][] = [];
  for (const d of daily) {
    const ms = Date.parse(d.date + "T00:00:00Z");
    const wk = Math.floor((ms - mondayMs) / (7 * DAY));
    const wd = (new Date(ms).getUTCDay() + 6) % 7;
    if (!raw[wk]) raw[wk] = new Array(WD).fill(0);
    raw[wk][wd] += d.load;
    weeksN = Math.max(weeksN, wk + 1);
  }
  for (let c = 0; c < weeksN; c++) if (!raw[c]) raw[c] = new Array(WD).fill(0);

  const bin = Math.ceil(weeksN / MAXCOL);
  let base: Grid;
  let colDays = 1; // days per column (for date labels after binning)
  if (bin > 1) {
    const cols = Math.ceil(weeksN / bin);
    base = Array.from({ length: cols }, () => new Array(WD).fill(0));
    for (let c = 0; c < weeksN; c++)
      for (let r = 0; r < WD; r++) base[Math.floor(c / bin)][r] += raw[c][r];
    colDays = bin * 7;
  } else base = raw;
  if (base.length < 2) base.push(new Array(WD).fill(0));

  const WEEKS = base.length;
  let pk = 0;
  for (let c = 0; c < WEEKS; c++) for (let r = 0; r < WD; r++) pk = Math.max(pk, base[c][r]);
  const blurred = boxBlur(base);
  let norm = 0;
  for (let c = 0; c < WEEKS; c++) for (let r = 0; r < WD; r++) norm = Math.max(norm, blurred[c][r]);
  norm = norm || 1;

  const U = WEEKS <= 10 ? 3 : WEEKS <= 22 ? 2 : 1;
  const C = (WEEKS - 1) * U + 1;
  const R = (WD - 1) * U + 1;

  const verts: Vert[] = [];
  const heights: number[] = [];
  for (let c = 0; c < C; c++)
    for (let r = 0; r < R; r++) {
      const zv = bilinear(blurred, c / U, r / U) / norm;
      heights.push(zv);
      verts.push({
        x: (c / (C - 1) - 0.5) * AX,
        y: (r / (R - 1) - 0.5) * AY,
        z: zv * AZ,
      });
    }
  const idx = (c: number, r: number) => c * R + r;

  const segs: [number, number, number][] = [];
  const level = (a: number, b: number) =>
    Math.max(0, Math.min(5, Math.floor(((heights[a] + heights[b]) / 2) * 6)));
  for (let c = 0; c < C; c++)
    for (let r = 0; r < R; r++) {
      const a = idx(c, r);
      if (c + 1 < C) {
        const b = idx(c + 1, r);
        segs.push([a, b, level(a, b)]);
      }
      if (r + 1 < R) {
        const b = idx(c, r + 1);
        segs.push([a, b, level(a, b)]);
      }
    }

  // Floor lines at base resolution, z=0.
  const floorVerts: Vert[] = [];
  const fIdx = (c: number, r: number) => c * WD + r;
  for (let c = 0; c < WEEKS; c++)
    for (let r = 0; r < WD; r++)
      floorVerts.push({ x: (c / (WEEKS - 1) - 0.5) * AX, y: (r / (WD - 1) - 0.5) * AY, z: 0 });
  const floorSegs: [number, number][] = [];
  for (let c = 0; c < WEEKS; c++)
    for (let r = 0; r < WD; r++) {
      if (c + 1 < WEEKS) floorSegs.push([fIdx(c, r), fIdx(c + 1, r)]);
      if (r + 1 < WD) floorSegs.push([fIdx(c, r), fIdx(c, r + 1)]);
    }
  // floor verts appended after mesh verts, offset in index space
  const floorOffset = verts.length;
  for (const v of floorVerts) verts.push(v);
  const floorSegsShifted: [number, number][] = floorSegs.map(([a, b]) => [a + floorOffset, b + floorOffset]);

  // Pickable base data points (actual weeks × weekdays).
  const picks: Model["picks"] = [];
  for (let c = 0; c < WEEKS; c++)
    for (let r = 0; r < WD; r++) {
      const load = base[c][r];
      const dateMs = mondayMs + (c * colDays + r) * DAY;
      picks.push({
        x: (c / (WEEKS - 1) - 0.5) * AX,
        y: (r / (WD - 1) - 0.5) * AY,
        z: (blurred[c][r] / norm) * AZ,
        date: new Date(dateMs).toISOString().slice(0, 10),
        wd: r,
        load,
      });
    }

  return { verts, segs, floorSegs: floorSegsShifted, picks, peak: Math.round(pk), weeks: WEEKS };
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d
    .toLocaleDateString("en-US", { day: "2-digit", month: "short", timeZone: "UTC" })
    .toUpperCase();
}

export default function LoadTopography({ overview }: { overview: Overview }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 380 });
  const [az, setAz] = useState(AZ0);
  const [el, setEl] = useState(EL0);
  const [hover, setHover] = useState<{ px: number; py: number; date: string; wd: number; load: number } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const ro = new ResizeObserver((es) => {
      const cr = es[0].contentRect;
      setSize({ w: Math.round(cr.width), h: Math.round(cr.height) });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => buildModel(overview), [overview]);

  // Project + fit for current angles/size.
  const scene = useMemo(() => {
    const { verts, segs, floorSegs, picks } = model;
    if (verts.length === 0 || size.w < 20) return { paths: {} as Record<number, string>, floor: "", pick: [] as { x: number; y: number; d: any }[] };
    const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
    const project = (v: Vert) => {
      const x1 = v.x * ca - v.y * sa;
      const y1 = v.x * sa + v.y * ca;
      const y2 = y1 * ce - v.z * se;
      const z2 = y1 * se + v.z * ce;
      return { sx: x1, sy: -z2, depth: y2 };
    };
    const proj = verts.map(project);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of proj) {
      if (p.sx < minX) minX = p.sx;
      if (p.sx > maxX) maxX = p.sx;
      if (p.sy < minY) minY = p.sy;
      if (p.sy > maxY) maxY = p.sy;
    }
    const pad = 22;
    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;
    const scale = Math.min((size.w - 2 * pad) / bw, (size.h - 2 * pad) / bh);
    const ox = (size.w - bw * scale) / 2 - minX * scale;
    const oy = (size.h - bh * scale) / 2 - minY * scale;
    const SX = proj.map((p) => p.sx * scale + ox);
    const SY = proj.map((p) => p.sy * scale + oy);

    const paths: Record<number, string> = { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" };
    for (const [a, b, lv] of segs)
      paths[lv] += `M${SX[a].toFixed(1)} ${SY[a].toFixed(1)}L${SX[b].toFixed(1)} ${SY[b].toFixed(1)}`;
    let floor = "";
    for (const [a, b] of floorSegs)
      floor += `M${SX[a].toFixed(1)} ${SY[a].toFixed(1)}L${SX[b].toFixed(1)} ${SY[b].toFixed(1)}`;

    const pick = picks.map((pt) => {
      const p = project(pt);
      return { x: p.sx * scale + ox, y: p.sy * scale + oy, d: pt };
    });
    return { paths, floor, pick };
  }, [model, az, el, size]);

  const onDown = (e: React.MouseEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    setHover(null);
  };
  const onMove = (e: React.MouseEvent) => {
    if (drag.current) {
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current = { x: e.clientX, y: e.clientY };
      setAz((a) => clamp(a + dx * 0.01, AZ_MIN, AZ_MAX));
      setEl((v) => clamp(v - dy * 0.008, EL_MIN, EL_MAX));
      return;
    }
    // hover pick
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best: any = null;
    let bd = 20 * 20;
    for (const p of scene.pick) {
      const d2 = (p.x - mx) ** 2 + (p.y - my) ** 2;
      if (d2 < bd) {
        bd = d2;
        best = p;
      }
    }
    setHover(best ? { px: best.x, py: best.y, ...best.d } : null);
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <section className="flex flex-col h-full">
      <div className="sec-h">
        <span>LOAD TOPOGRAPHY // FIELD SCAN</span>
        <span className="meta">{model.weeks}W · ISO · DRAG</span>
      </div>
      <div className="rule mt-2 mb-3" />

      <div
        ref={boxRef}
        className={`border border-ink flex-1 min-h-[300px] relative overflow-hidden select-none ${
          drag.current ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={() => {
          endDrag();
          setHover(null);
        }}
        onDoubleClick={() => {
          setAz(AZ0);
          setEl(EL0);
        }}
      >
        <svg viewBox={`0 0 ${size.w} ${size.h}`} width="100%" height="100%" className="block absolute inset-0">
          <path d={scene.floor} fill="none" stroke="#e6e6e6" strokeWidth="1" />
          {[0, 1, 2, 3, 4, 5].map((lv) => (
            <path key={lv} d={scene.paths[lv] ?? ""} fill="none" stroke={SHADES[lv]} strokeWidth="1" />
          ))}
          {hover && <circle cx={hover.px} cy={hover.py} r={3.5} fill="#0a0a0a" />}
        </svg>

        {hover && (
          <div
            className={`absolute -translate-x-1/2 ${hover.py < 42 ? "" : "-translate-y-full"} pointer-events-none whitespace-nowrap border border-ink bg-paper px-2 py-1 text-[12px] uppercase tracking-[0.04em] shadow-[3px_3px_0_0_rgba(10,10,10,0.16)]`}
            style={{ left: Math.max(60, Math.min(size.w - 60, hover.px)), top: hover.py < 42 ? hover.py + 12 : hover.py - 8 }}
          >
            {WDNAME[hover.wd]} {fmtDate(hover.date)} · <span className="hot">{Math.round(hover.load)}</span> TSS
          </div>
        )}
      </div>

      <div className="flex justify-between text-[12px] uppercase tracking-[0.04em] mt-2 text-dim">
        <span>AXIS_X: WEEK →</span>
        <span>AXIS_Y: WEEKDAY</span>
        <span>
          Z_PEAK: <span className="hot text-ink">{model.peak}</span> TSS
        </span>
      </div>
    </section>
  );
}
