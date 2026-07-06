import { ATHLETE_ID, KEY, authHeader, API_BASE } from "./_intervals.js";

// Fallback the SPA only hits if /api/session reported not-authenticated.
export default async function handler(_req, res) {
  if (!KEY) return res.status(400).json({ error: "No API key configured on the server" });
  try {
    const r = await fetch(`${API_BASE}/athlete/${ATHLETE_ID}`, {
      headers: { Authorization: authHeader() },
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `intervals.icu rejected the API key (${r.status})`, detail: text.slice(0, 200) });
    }
    const p = await r.json();
    res.json({ ok: true, athlete: { id: p.id, name: p.name || p.firstname || "Athlete" } });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
