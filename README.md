# LoL Live Cockpit

Live League of Legends esports dashboard and model signal cockpit.

## Goal

Show upcoming LCK games, separate live games, and display live win-probability charts with simple BUY / WAIT / SELL signals.

The current signal policy is probability-by-time based:

- 0-5 minutes: BUY if model leader is at least 70%.
- 5-10 minutes: BUY if model leader is at least 60%.
- 10-20 minutes: BUY if model leader is at least 55%.
- 20+ minutes: BUY if model leader is at least 55%.
- SELL if the active side drops below 50%.

## Safety

No Telegram tokens, API keys, market credentials, or `.env` files belong in this repository. Put secrets only on the local machine or Oracle VPS.

## Planned Architecture

```text
LoL Esports live feed
  -> Python backend/model scorer
  -> REST API
  -> React dashboard
  -> optional Telegram alerts
```

## Current Frontend

The first Vite/React frontend is in `frontend/`.

It already includes:

- Upcoming LCK games.
- Live games section.
- Embedded LCK Twitch stream.
- Live probability chart.
- BUY / WAIT / SELL signal card.
- Game stats card.
- Mock fallback data until the backend API is connected.

Run it:

```powershell
cd frontend
npm install
npm run dev
```

## Backend API Plan

- `GET /api/schedule?league=lck`
- `GET /api/live-games?league=lck`
- `GET /api/live/{match_id}`
- `GET /api/signals/{game_id}`

## Deployment Plan

1. Develop locally.
2. Push to GitHub.
3. Pull on Oracle Free VPS.
4. Store secrets in VPS `.env`.
5. Run backend with `systemd`.
6. Expose dashboard using Cloudflare Tunnel.

## Reference

The folder next to this repo contains a local reference clone of `AndyDanger/live-lol-esports`.
That project is GPL-3.0, so this project should use it as design/API inspiration unless we intentionally choose GPL-compatible derivative licensing.
