// Loose shapes — intervals.icu returns many fields; we only depend on a few and
// treat the rest as optional so missing data never crashes the overview.

export interface Activity {
  id: string;
  name?: string;
  type?: string;
  start_date_local?: string;
  moving_time?: number; // seconds
  elapsed_time?: number;
  distance?: number; // meters
  total_elevation_gain?: number; // meters
  icu_training_load?: number;
  icu_intensity?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  icu_average_watts?: number;
  average_watts?: number;
  calories?: number;
  [k: string]: unknown;
}

export interface Wellness {
  id: string; // date YYYY-MM-DD
  ctl?: number; // fitness
  atl?: number; // fatigue
  rampRate?: number;
  weight?: number;
  restingHR?: number;
  hrv?: number;
  sleepSecs?: number;
  [k: string]: unknown;
}

export interface AthleteProfile {
  id?: string;
  name?: string;
  firstname?: string;
  icu_weight?: number;
  icu_resting_hr?: number;
  [k: string]: unknown;
}

export interface SessionState {
  authenticated: boolean;
  athlete: { id: string; name: string } | null;
  authMode: "oauth" | "apikey" | "none";
}

export type PeriodKey = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";
