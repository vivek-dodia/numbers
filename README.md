# NUMBERS

A single-page training dashboard for [intervals.icu](https://intervals.icu),
styled as a monochrome dot-matrix terminal ledger. It pulls your activities and
wellness data and renders them as core vitals, a sport-mix capacity matrix, a
switchable signal-topology trace, an interactive 3D load-topography surface, a
grayscale density calendar, and a session event log.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind (v4)
- **Backend:** Express — holds credentials server-side and proxies the
  intervals.icu API (also handles OAuth if configured)
- Hand-rolled SVG visuals (3D isometric mesh, oscilloscope, heatmap) — no chart
  library.

## Setup

```bash
npm install
cp .env.example .env      # then fill in INTERVALS_API_KEY and ATHLETE_ID
```

Get your API key from **intervals.icu → Settings → Developer**. Your athlete id
looks like `iXXXXXX`.

## Run

```bash
npm run dev      # Vite (http://localhost:5173) + API server, hot reload
# or
npm run build && npm start   # production build served at http://localhost:3001
```

The app auto-authenticates from the server-side `.env` key on load — no login
screen. Credentials never reach the browser.

## Deploy on Vercel

Import the repo (framework preset: **Vite**) and add two environment variables:

| Variable            | Example    |
| ------------------- | ---------- |
| `INTERVALS_API_KEY` | your key   |
| `ATHLETE_ID`        | `iXXXXXX`  |

The `/api/*` serverless functions read those and proxy intervals.icu, so the key
stays server-side. Local dev keeps using the Express server in `server/`.

> ⚠️ The deployed URL serves your training data to anyone who opens it — there's
> no per-visitor auth. Keep the URL private, or ask for a password gate.

## Notes

- OAuth ("Log in with intervals.icu") is wired in the local Express backend but
  optional; the API key path is the default. Leave the OAuth vars blank.
- `.env` is gitignored — only `.env.example` is committed.
