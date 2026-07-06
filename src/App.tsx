import { useEffect, useMemo, useState } from "react";
import type { Activity, PeriodKey, Wellness } from "./types";
import * as api from "./lib/api";
import { PERIODS, computeOverview } from "./lib/metrics";

import Loading from "./components/Loading";
import StatusBar from "./components/StatusBar";
import CoreVitals from "./components/CoreVitals";
import ResourceMatrix from "./components/ResourceMatrix";
import SignalTopology from "./components/SignalTopology";
import LoadTopography from "./components/LoadTopography";
import SectorDensity from "./components/SectorDensity";
import EventLog from "./components/EventLog";
import LedgerFooter from "./components/LedgerFooter";

const HISTORY_START = "2010-01-01";

interface Data {
  activities: Activity[];
  wellness: Wellness[];
  athleteName: string;
}

type Screen = { kind: "loading"; label?: string } | { kind: "error" } | { kind: "dashboard" };

export default function App() {
  const [data, setData] = useState<Data | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "loading", label: "BOOTING" });
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("1M");

  useEffect(() => {
    boot();
  }, []);

  // Auto-mount straight from the server-side .env credentials — no login step.
  async function boot() {
    setScreen({ kind: "loading", label: "MOUNTING LEDGER" });
    setError(null);
    try {
      let s = await api.getSession();
      if (!s.authenticated) {
        if (s.authMode === "apikey") {
          await api.apiKeyLogin();
          s = await api.getSession();
        } else {
          throw new Error(
            s.authMode === "oauth"
              ? "OAUTH MODE NEEDS INTERACTIVE LOGIN — SET INTERVALS_API_KEY IN .ENV"
              : "NO CREDENTIALS FOUND IN .ENV",
          );
        }
      }
      const name = s.athlete?.name ?? "ATHLETE";
      const [activities, wellness] = await Promise.all([
        api.getActivities(HISTORY_START),
        api.getWellness(HISTORY_START).catch(() => [] as Wellness[]),
      ]);
      setData({ activities: activities ?? [], wellness: wellness ?? [], athleteName: name });
      setScreen({ kind: "dashboard" });
    } catch (e) {
      setError((e as Error).message);
      setScreen({ kind: "error" });
    }
  }

  if (screen.kind === "loading") return <Loading label={screen.label} />;
  if (screen.kind === "error" || !data) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <div className="text-[13px] uppercase tracking-[0.14em] mb-4">&gt; MOUNT FAILED</div>
          <div className="text-[12px] uppercase tracking-[0.04em] border border-ink px-4 py-2 inline-block">
            ERR: {error ?? "UNKNOWN"}
          </div>
          <div>
            <button
              onClick={boot}
              className="mt-5 text-[12px] uppercase tracking-[0.06em] text-dim hover:text-ink hover:underline underline-offset-2"
            >
              [ retry ]
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard data={data} period={period} onPeriod={setPeriod} />;
}

function Dashboard({
  data,
  period,
  onPeriod,
}: {
  data: Data;
  period: PeriodKey;
  onPeriod: (k: PeriodKey) => void;
}) {
  const def = PERIODS.find((p) => p.key === period)!;
  const overview = useMemo(() => computeOverview(data.activities, data.wellness, def), [data, def]);

  const activitiesInRange = useMemo(
    () =>
      data.activities.filter((a) => {
        const ts = new Date(a.start_date_local ?? 0).getTime();
        return ts >= overview.from.getTime() && ts <= overview.to.getTime();
      }),
    [data.activities, overview],
  );

  const session =
    "TERM-" + (data.athleteName.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "01A");

  return (
    <div className="min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-[1720px] px-5 md:px-10 xl:px-14 py-2 flex-1 flex flex-col">
        <div className="rule mt-1 mb-3" />

        <StatusBar
          session={session}
          loc={`INTERVALS.ICU // ${def.full.toUpperCase()}`}
          online
          period={period}
          onPeriod={onPeriod}
        />
        <div className="rule mt-1 mb-5" />

        {/* Row 1: vitals · matrix · 3D topography hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-stretch">
          <div className="lg:col-span-3">
            <CoreVitals overview={overview} />
          </div>
          <div className="lg:col-span-3">
            <ResourceMatrix overview={overview} />
          </div>
          <div className="lg:col-span-6">
            <LoadTopography overview={overview} />
          </div>
        </div>

        <div className="rule my-5" />

        {/* Row 2: signal · density · event log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-stretch">
          <div className="lg:col-span-4">
            <SignalTopology overview={overview} />
          </div>
          <div className="lg:col-span-4">
            <SectorDensity activities={data.activities} />
          </div>
          <div className="lg:col-span-4">
            <EventLog activities={activitiesInRange} />
          </div>
        </div>

        <div className="mt-auto">
          <LedgerFooter overview={overview} activityCount={data.activities.length} />
        </div>
      </div>
    </div>
  );
}
