import express from "express";
import session from "express-session";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const {
  INTERVALS_CLIENT_ID = "",
  INTERVALS_CLIENT_SECRET = "",
  REDIRECT_URI = "http://localhost:3001/auth/callback",
  INTERVALS_SCOPES = "ACTIVITY:READ,WELLNESS:READ,SETTINGS:READ",
  INTERVALS_API_KEY = "",
  ATHLETE_ID = "0",
  SESSION_SECRET = "dev-insecure-secret-change-me",
  CLIENT_ORIGIN = "http://localhost:5173",
  PORT = 3001,
} = process.env;

const IS_PROD = process.env.NODE_ENV === "production";
const OAUTH_CONFIGURED = Boolean(INTERVALS_CLIENT_ID && INTERVALS_CLIENT_SECRET);
const API_KEY_CONFIGURED = Boolean(INTERVALS_API_KEY);
// Auth mode the frontend should present: OAuth popup wins when available.
const AUTH_MODE = OAUTH_CONFIGURED ? "oauth" : API_KEY_CONFIGURED ? "apikey" : "none";

// intervals.icu endpoints (see forum.intervals.icu OAuth support thread)
const AUTHORIZE_URL = "https://intervals.icu/oauth/authorize";
const TOKEN_URL = "https://intervals.icu/api/oauth/token";
const API_BASE = "https://intervals.icu/api/v1";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(
  session({
    name: "telemetry.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: "auto", // secure only over real https; allows http://localhost
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  }),
);

// In production the app is served from this same origin, so redirect home to
// "/". In dev the SPA lives on the Vite origin.
const appHome = () => (IS_PROD ? "/" : CLIENT_ORIGIN);

// ── OAuth: kick off the authorize flow ──────────────────────────────────────
app.get("/auth/login", (req, res) => {
  if (!OAUTH_CONFIGURED) {
    return res
      .status(500)
      .send(
        "OAuth is not configured. Copy .env.example to .env and set INTERVALS_CLIENT_ID / INTERVALS_CLIENT_SECRET.",
      );
  }
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", INTERVALS_CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", INTERVALS_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

// ── OAuth: handle the redirect back, exchange code for a token ───────────────
app.get("/auth/callback", async (req, res) => {
  const { code, state, error } = req.query;

  const closePage = (payload) => `<!doctype html><html><head><meta charset="utf-8">
<title>intervals.icu</title><style>
  html,body{height:100%;margin:0;background:#080B10;color:#E6EDF3;
    font-family:'Space Grotesk',system-ui,sans-serif;display:grid;place-items:center}
  .card{text-align:center}.dot{width:10px;height:10px;border-radius:50%;
    background:#4CE0C8;display:inline-block;box-shadow:0 0 18px #4CE0C8}
</style></head><body><div class="card"><p><span class="dot"></span></p>
<p>${payload.ok ? "Connected. Returning to Telemetry…" : "Sign-in failed: " + payload.error}</p></div>
<script>
  var msg = ${JSON.stringify(payload)};
  if (window.opener) { window.opener.postMessage({ source: "intervals-oauth", ...msg }, "*"); }
  setTimeout(function(){ ${
    "if (window.opener) { window.close(); } else { location.href = " +
    JSON.stringify(appHome()) +
    "; }"
  } }, ${payload.ok ? 600 : 2500});
</script></body></html>`;

  if (error) return res.status(400).send(closePage({ ok: false, error: String(error) }));
  if (!code || !state || state !== req.session.oauthState) {
    return res.status(400).send(closePage({ ok: false, error: "Invalid state or missing code" }));
  }
  delete req.session.oauthState;

  try {
    const body = new URLSearchParams({
      client_id: INTERVALS_CLIENT_ID,
      client_secret: INTERVALS_CLIENT_SECRET,
      code: String(code),
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    });
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).send(closePage({ ok: false, error: `Token exchange failed (${r.status}): ${text.slice(0, 200)}` }));
    }
    const token = await r.json();
    req.session.accessToken = token.access_token;
    req.session.athlete = token.athlete || null;
    req.session.scope = token.scope || INTERVALS_SCOPES;
    res.send(closePage({ ok: true, athlete: req.session.athlete }));
  } catch (e) {
    res.status(500).send(closePage({ ok: false, error: e.message }));
  }
});

// ── API-key login: one click when OAuth isn't configured ────────────────────
// Verifies the server-side key against intervals.icu, then marks the session
// authenticated. The key itself never reaches the browser.
app.post("/auth/apikey-login", async (req, res) => {
  if (!API_KEY_CONFIGURED) return res.status(400).json({ error: "No API key configured on the server" });
  try {
    const r = await fetch(`${API_BASE}/athlete/${ATHLETE_ID}`, {
      headers: { Authorization: basicAuthHeader() },
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `intervals.icu rejected the API key (${r.status})`, detail: text.slice(0, 200) });
    }
    const profile = await r.json();
    req.session.authViaKey = true;
    req.session.athlete = { id: profile.id, name: profile.name || profile.firstname || "Athlete" };
    res.json({ ok: true, athlete: req.session.athlete });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Session/auth state for the SPA to read on load.
app.get("/api/session", (req, res) => {
  res.json({
    authenticated: Boolean(req.session.accessToken || req.session.authViaKey),
    athlete: req.session.athlete || null,
    authMode: AUTH_MODE,
  });
});

// ── Authenticated proxy helpers ─────────────────────────────────────────────
function basicAuthHeader() {
  return "Basic " + Buffer.from(`API_KEY:${INTERVALS_API_KEY}`).toString("base64");
}

function requireAuth(req, res, next) {
  if (req.session.accessToken || req.session.authViaKey) return next();
  res.status(401).json({ error: "Not authenticated" });
}

// The athlete id to query: OAuth resolves "0" to the current athlete; the API
// key path uses the configured athlete id.
function athleteId(req) {
  return req.session.accessToken ? "0" : ATHLETE_ID;
}

function authHeader(req) {
  return req.session.accessToken ? `Bearer ${req.session.accessToken}` : basicAuthHeader();
}

async function forward(req, res, apiPath, params = {}) {
  const url = new URL(API_BASE + apiPath);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  try {
    const r = await fetch(url, { headers: { Authorization: authHeader(req) } });
    const text = await r.text();
    res.status(r.status);
    res.set("Content-Type", r.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}

app.get("/api/athlete", requireAuth, (req, res) => forward(req, res, `/athlete/${athleteId(req)}`));

app.get("/api/activities", requireAuth, (req, res) =>
  forward(req, res, `/athlete/${athleteId(req)}/activities`, {
    oldest: req.query.oldest,
    newest: req.query.newest,
  }),
);

app.get("/api/wellness", requireAuth, (req, res) =>
  forward(req, res, `/athlete/${athleteId(req)}/wellness`, {
    oldest: req.query.oldest,
    newest: req.query.newest,
  }),
);

// ── Serve the built SPA in production ───────────────────────────────────────
const distDir = path.join(ROOT, "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/auth")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`\n  Telemetry backend on http://localhost:${PORT}`);
  console.log(`  Auth mode: ${AUTH_MODE}${AUTH_MODE === "none" ? " — set an API key or OAuth creds in .env" : ""}`);
  if (!IS_PROD) console.log(`  Open the app at ${CLIENT_ORIGIN}\n`);
});
