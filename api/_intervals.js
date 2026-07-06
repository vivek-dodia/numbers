// Shared helper for the Vercel serverless functions. Files prefixed with "_"
// are not treated as routes. Credentials come from env and never reach the
// browser — each function proxies intervals.icu with HTTP Basic auth.

export const API_BASE = "https://intervals.icu/api/v1";
export const KEY = process.env.INTERVALS_API_KEY || "";
export const ATHLETE_ID = process.env.ATHLETE_ID || "0";

export function authHeader() {
  return "Basic " + Buffer.from(`API_KEY:${KEY}`).toString("base64");
}

export async function proxy(res, path, params = {}) {
  if (!KEY) {
    res.status(500).json({ error: "INTERVALS_API_KEY is not set" });
    return;
  }
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  try {
    const r = await fetch(url, { headers: { Authorization: authHeader() } });
    const text = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
