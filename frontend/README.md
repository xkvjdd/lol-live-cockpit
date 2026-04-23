# Frontend

React/Vite cockpit for the LCK live model.

## What Works

- Upcoming LCK games section.
- Live games section.
- Embedded LCK Twitch stream.
- Live win-probability chart.
- BUY / WAIT / SELL signal card.
- Compact game stats: time, patch, kills, gold, dragons, barons, towers.
- Mock fallback data when the backend API is not running.

## Run Locally

```powershell
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Backend Contract

The UI polls:

- `GET /api/live-games?league=lck`
- `GET /api/schedule?league=lck`

Vite proxies `/api` to `http://127.0.0.1:8765` during local development.

The UI is original code. It uses the public AndyDanger project as product inspiration only, not copied source.
