import { ATHLETE_ID, KEY, authHeader, API_BASE, requireUnlock } from "./_intervals.js";

// The SPA probes this on boot. With a server-side key there's no login step —
// we resolve the athlete and report authenticated straight away.
export default async function handler(req, res) {
  if (!requireUnlock(req, res)) return;
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
