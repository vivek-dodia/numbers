// Shared helper for the Vercel serverless functions. Files prefixed with "_"
// are not treated as routes. Credentials come from env and never reach the
// browser — each function proxies intervals.icu with HTTP Basic auth.

import crypto from "node:crypto";

export const API_BASE = "https://intervals.icu/api/v1";
export const KEY = process.env.INTERVALS_API_KEY || "";
export const ATHLETE_ID = process.env.ATHLETE_ID || "0";

export function authHeader() {
  return "Basic " + Buffer.from(`API_KEY:${KEY}`).toString("base64");
}

// ── Access gate ─────────────────────────────────────────────────────────────
// If SITE_PASSWORD is set, every data endpoint requires an unlock cookie whose
// value equals sha256(SITE_PASSWORD). Unset = open (local dev convenience).
const SITE_PASSWORD = process.env.SITE_PASSWORD || "";
export const GATED = Boolean(SITE_PASSWORD);
export const TOKEN = SITE_PASSWORD ? crypto.createHash("sha256").update(SITE_PASSWORD).digest("hex") : "";
export const COOKIE = "numbers_auth";

export function hash(pw) {
  return crypto.createHash("sha256").update(String(pw)).digest("hex");
}

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Returns true if allowed. If not, sends 401 and returns false.
export function requireUnlock(req, res) {
  if (!GATED) return true;
  const cookies = parseCookies(req.headers.cookie || "");
  if (cookies[COOKIE] === TOKEN) return true;
  res.status(401).json({ error: "locked" });
  return false;
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
