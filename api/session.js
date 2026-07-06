import { ATHLETE_ID, KEY, authHeader, API_BASE } from "./_intervals.js";

// Reports the athlete + auth mode so the SPA can boot straight into the data.
export default async function handler(_req, res) {
  if (!KEY) return res.json({ authenticated: false, athlete: null, authMode: "none" });
  try {
    const r = await fetch(`${API_BASE}/athlete/${ATHLETE_ID}`, {
      headers: { Authorization: authHeader() },
    });
    if (!r.ok) return res.json({ authenticated: false, athlete: null, authMode: "apikey" });
    const p = await r.json();
    res.json({
      authenticated: true,
      athlete: { id: p.id, name: p.name || p.firstname || "Athlete" },
      authMode: "apikey",
    });
  } catch {
    res.json({ authenticated: false, athlete: null, authMode: "apikey" });
  }
}
