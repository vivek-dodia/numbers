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

## Notes

- OAuth ("Log in with intervals.icu") is wired in the backend but optional; the
  API key path is the default. Leave the OAuth vars blank to use the key.
- `.env` is gitignored — only `.env.example` is committed.
