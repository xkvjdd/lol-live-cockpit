import { useEffect, useMemo, useRef, useState } from "react";

type ProbabilityPoint = {
  ts: string;
  time: string;
  blueProb: number;
  redProb: number;
};

type LiveGame = {
  matchId: string;
  gameId: string;
  league: string;
  gameNumber: number;
  bestOf: number;
  patch: string;
  blueTeam: string;
  redTeam: string;
  blueProb: number;
  redProb: number;
  bluePregameProb: number;
  redPregameProb: number;
  time: string;
  scoreline: string;
  goldline: string;
  dragons: string;
  barons: string;
  towers: string;
  action: "BUY" | "WAIT" | "SELL";
  actionTeam: string;
  actionProb: number;
  actionThreshold: number;
  actionReason: string;
  history: ProbabilityPoint[];
};

type ScheduleEvent = {
  id: string;
  state: "inProgress" | "unstarted" | "completed";
  league: string;
  startTime: string;
  team1: string;
  team2: string;
  bestOf: number;
  team1PregameProb?: number;
  team2PregameProb?: number;
};

type ApiState = {
  liveGames: LiveGame[];
  schedule: ScheduleEvent[];
  apiStatus: "connected" | "mock" | "loading";
  lastUpdated: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const MOCK_HISTORY: ProbabilityPoint[] = [
  { ts: "1", time: "00:00", blueProb: 0.58, redProb: 0.42 },
  { ts: "2", time: "03:00", blueProb: 0.61, redProb: 0.39 },
  { ts: "3", time: "06:00", blueProb: 0.64, redProb: 0.36 },
  { ts: "4", time: "09:00", blueProb: 0.59, redProb: 0.41 },
  { ts: "5", time: "12:00", blueProb: 0.67, redProb: 0.33 },
  { ts: "6", time: "15:00", blueProb: 0.72, redProb: 0.28 }
];

const MOCK_LIVE_GAMES: LiveGame[] = [
  {
    matchId: "demo-match",
    gameId: "demo-game-2",
    league: "LCK",
    gameNumber: 2,
    bestOf: 3,
    patch: "16.8",
    blueTeam: "Gen.G",
    redTeam: "Dplus KIA",
    blueProb: 0.72,
    redProb: 0.28,
    bluePregameProb: 0.61,
    redPregameProb: 0.39,
    time: "15:00",
    scoreline: "5-3",
    goldline: "31.4k-29.8k",
    dragons: "2-1",
    barons: "0-0",
    towers: "4-2",
    action: "BUY",
    actionTeam: "Gen.G",
    actionProb: 0.72,
    actionThreshold: 0.55,
    actionReason: "10-20m trigger is 55%; model leader clears it.",
    history: MOCK_HISTORY
  }
];

const MOCK_SCHEDULE: ScheduleEvent[] = [
  {
    id: "demo-live",
    state: "inProgress",
    league: "LCK",
    startTime: new Date().toISOString(),
    team1: "Gen.G",
    team2: "Dplus KIA",
    bestOf: 3,
    team1PregameProb: 0.61,
    team2PregameProb: 0.39
  },
  {
    id: "demo-next-1",
    state: "unstarted",
    league: "LCK",
    startTime: "2026-04-24T08:00:00Z",
    team1: "BNK FEARX",
    team2: "kt Rolster",
    bestOf: 3,
    team1PregameProb: 0.44,
    team2PregameProb: 0.56
  },
  {
    id: "demo-next-2",
    state: "unstarted",
    league: "LCK",
    startTime: "2026-04-24T10:00:00Z",
    team1: "T1",
    team2: "Hanwha Life Esports",
    bestOf: 3,
    team1PregameProb: 0.49,
    team2PregameProb: 0.51
  }
];

export function App() {
  const [state, setState] = useState<ApiState>({
    liveGames: MOCK_LIVE_GAMES,
    schedule: MOCK_SCHEDULE,
    apiStatus: "loading",
    lastUpdated: "starting"
  });
  const [selectedGameId, setSelectedGameId] = useState<string>(MOCK_LIVE_GAMES[0].gameId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next = await fetchCockpitData();
      if (!cancelled) {
        setState(next);
        if (next.liveGames.length && !next.liveGames.some((game) => game.gameId === selectedGameId)) {
          setSelectedGameId(next.liveGames[0].gameId);
        }
      }
    }
    load();
    const timer = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedGameId]);

  const selectedGame = useMemo(
    () => state.liveGames.find((game) => game.gameId === selectedGameId) ?? state.liveGames[0],
    [selectedGameId, state.liveGames]
  );
  const upcoming = state.schedule.filter((event) => event.state === "unstarted").slice(0, 8);

  return (
    <main className="shell">
      <Header apiStatus={state.apiStatus} lastUpdated={state.lastUpdated} />
      <section className="hero-grid">
        <StreamPanel />
        <div className="stack">
          <LiveGames games={state.liveGames} selectedGameId={selectedGame?.gameId} onSelect={setSelectedGameId} />
          <UpcomingGames events={upcoming} />
        </div>
      </section>
      {selectedGame ? <GameCockpit game={selectedGame} /> : <EmptyState />}
    </main>
  );
}

async function fetchCockpitData(): Promise<ApiState> {
  try {
    const [liveResponse, scheduleResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/live-games?league=lck`, { cache: "no-store" }),
      fetch(`${API_BASE_URL}/api/schedule?league=lck`, { cache: "no-store" })
    ]);
    if (!liveResponse.ok || !scheduleResponse.ok) {
      throw new Error("backend unavailable");
    }
    const livePayload = await liveResponse.json();
    const schedulePayload = await scheduleResponse.json();
    return {
      liveGames: normalizeLiveGames(livePayload),
      schedule: normalizeSchedule(schedulePayload),
      apiStatus: "connected",
      lastUpdated: new Date().toLocaleTimeString()
    };
  } catch {
    return {
      liveGames: MOCK_LIVE_GAMES,
      schedule: MOCK_SCHEDULE,
      apiStatus: "mock",
      lastUpdated: new Date().toLocaleTimeString()
    };
  }
}

function normalizeLiveGames(payload: unknown): LiveGame[] {
  const rawGames = Array.isArray(payload) ? payload : Array.isArray((payload as { games?: unknown[] })?.games) ? (payload as { games: unknown[] }).games : [];
  return rawGames.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      matchId: String(item.matchId ?? item.match_id ?? `live-${index}`),
      gameId: String(item.gameId ?? item.game_id ?? `game-${index}`),
      league: String(item.league ?? "LCK"),
      gameNumber: Number(item.gameNumber ?? item.game_number ?? 1),
      bestOf: Number(item.bestOf ?? item.best_of ?? 3),
      patch: String(item.patch ?? "--"),
      blueTeam: String(item.blueTeam ?? item.blue_team ?? "Blue"),
      redTeam: String(item.redTeam ?? item.red_team ?? "Red"),
      blueProb: Number(item.blueProb ?? item.blue_prob ?? 0.5),
      redProb: Number(item.redProb ?? item.red_prob ?? 0.5),
      bluePregameProb: Number(item.bluePregameProb ?? item.blue_pregame_prob ?? 0.5),
      redPregameProb: Number(item.redPregameProb ?? item.red_pregame_prob ?? 0.5),
      time: String(item.time ?? "--"),
      scoreline: String(item.scoreline ?? "--"),
      goldline: String(item.goldline ?? "--"),
      dragons: String(item.dragons ?? "--"),
      barons: String(item.barons ?? "--"),
      towers: String(item.towers ?? "--"),
      action: normalizeAction(item.action),
      actionTeam: String(item.actionTeam ?? item.action_team ?? ""),
      actionProb: Number(item.actionProb ?? item.action_prob ?? 0),
      actionThreshold: Number(item.actionThreshold ?? item.action_threshold ?? 0),
      actionReason: String(item.actionReason ?? item.action_reason ?? ""),
      history: normalizeHistory(item.history)
    };
  });
}

function normalizeSchedule(payload: unknown): ScheduleEvent[] {
  const rawEvents = Array.isArray(payload) ? payload : Array.isArray((payload as { events?: unknown[] })?.events) ? (payload as { events: unknown[] }).events : [];
  return rawEvents.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      id: String(item.id ?? `event-${index}`),
      state: normalizeState(item.state),
      league: String(item.league ?? "LCK"),
      startTime: String(item.startTime ?? item.start_time ?? ""),
      team1: String(item.team1 ?? item.team_1 ?? "TBD"),
      team2: String(item.team2 ?? item.team_2 ?? "TBD"),
      bestOf: Number(item.bestOf ?? item.best_of ?? 3),
      team1PregameProb: optionalNumber(item.team1PregameProb ?? item.team1_pregame_prob),
      team2PregameProb: optionalNumber(item.team2PregameProb ?? item.team2_pregame_prob)
    };
  });
}

function normalizeHistory(rawHistory: unknown): ProbabilityPoint[] {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      ts: String(item.ts ?? index),
      time: String(item.time ?? "--"),
      blueProb: Number(item.blueProb ?? item.blue_prob ?? 0.5),
      redProb: Number(item.redProb ?? item.red_prob ?? 0.5)
    };
  });
}

function normalizeAction(value: unknown): LiveGame["action"] {
  const action = String(value ?? "WAIT").toUpperCase();
  if (action === "BUY" || action === "SELL") return action;
  return "WAIT";
}

function normalizeState(value: unknown): ScheduleEvent["state"] {
  const state = String(value ?? "unstarted");
  if (state === "inProgress" || state === "completed") return state;
  return "unstarted";
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function Header({ apiStatus, lastUpdated }: { apiStatus: ApiState["apiStatus"]; lastUpdated: string }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">LCK Live Model</p>
        <h1>Live Cockpit</h1>
      </div>
      <div className={`status-pill ${apiStatus}`}>
        <span className="pulse" />
        {apiStatus === "connected" ? "Backend connected" : apiStatus === "mock" ? "Mock data until backend is online" : "Connecting"}
        <small>{lastUpdated}</small>
      </div>
    </header>
  );
}

function StreamPanel() {
  const isIpHost = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
  const twitchSrc = useMemo(() => {
    const parents = [
      window.location.hostname,
      "15.135.167.228",
      "ec2-15-135-167-228.ap-southeast-2.compute.amazonaws.com",
      "xkvjdd.github.io",
      "localhost",
      "127.0.0.1"
    ].filter(Boolean);
    const params = new URLSearchParams({
      channel: "lck",
      muted: "true",
      autoplay: "false"
    });
    Array.from(new Set(parents)).forEach((parent) => params.append("parent", parent));
    return `https://player.twitch.tv/?${params.toString()}`;
  }, []);

  return (
    <section className="panel stream-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Broadcast</p>
          <h2>LCK Stream</h2>
        </div>
        <a className="ghost-link" href="https://www.twitch.tv/lck" target="_blank" rel="noreferrer">
          Open Twitch
        </a>
      </div>
      <div className="stream-frame">
        {isIpHost ? (
          <div className="stream-blocked">
            <strong>Twitch blocks raw-IP embeds.</strong>
            <span>The model dashboard still works here. Open the stream in a separate Twitch tab until we attach a real domain.</span>
            <a href="https://www.twitch.tv/lck" target="_blank" rel="noreferrer">Open LCK Stream</a>
          </div>
        ) : (
          <>
            <iframe
              src={twitchSrc}
              title="LCK Twitch Stream"
              allowFullScreen
              allow="autoplay; fullscreen"
            />
            <a className="stream-fallback" href="https://www.twitch.tv/lck" target="_blank" rel="noreferrer">
              If Twitch blocks the embed, open the LCK stream here.
            </a>
          </>
        )}
      </div>
    </section>
  );
}

function LiveGames({ games, selectedGameId, onSelect }: { games: LiveGame[]; selectedGameId?: string; onSelect: (id: string) => void }) {
  return (
    <section className="panel compact-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Now</p>
          <h2>Live Games</h2>
        </div>
        <span className="count">{games.length}</span>
      </div>
      <div className="card-list">
        {games.map((game) => (
          <button
            className={`match-card ${selectedGameId === game.gameId ? "selected" : ""}`}
            key={game.gameId}
            onClick={() => onSelect(game.gameId)}
            type="button"
          >
            <span>{game.blueTeam}</span>
            <strong>G{game.gameNumber}</strong>
            <span>{game.redTeam}</span>
            <em>{game.time}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function UpcomingGames({ events }: { events: ScheduleEvent[] }) {
  return (
    <section className="panel compact-panel">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Next</p>
          <h2>Upcoming LCK</h2>
        </div>
        <span className="count">{events.length}</span>
      </div>
      <div className="schedule-list">
        {events.map((event) => (
          <div className="schedule-row" key={event.id}>
            <span>{formatStart(event.startTime)}</span>
            <strong>
              {event.team1}
              <b>{formatOptionalPercent(event.team1PregameProb)}</b>
            </strong>
            <small>vs</small>
            <strong>
              {event.team2}
              <b>{formatOptionalPercent(event.team2PregameProb)}</b>
            </strong>
            <em>BO{event.bestOf}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function GameCockpit({ game }: { game: LiveGame }) {
  return (
    <section className="cockpit-grid">
      <div className="panel probability-panel">
        <div className="scoreboard">
          <TeamProbability
            side="blue"
            team={game.blueTeam}
            probability={game.blueProb}
            pregameProbability={game.bluePregameProb}
          />
          <div className="match-meta">
            <span>{game.league}</span>
            <strong>Game {game.gameNumber}</strong>
            <span>Patch {game.patch}</span>
          </div>
          <TeamProbability
            side="red"
            team={game.redTeam}
            probability={game.redProb}
            pregameProbability={game.redPregameProb}
          />
        </div>
        <ProbabilityChart points={game.history} blueTeam={game.blueTeam} redTeam={game.redTeam} />
      </div>
      <aside className="side-stack">
        <SignalCard game={game} />
        <StatsCard game={game} />
      </aside>
    </section>
  );
}

function TeamProbability({
  side,
  team,
  probability,
  pregameProbability
}: {
  side: "blue" | "red";
  team: string;
  probability: number;
  pregameProbability: number;
}) {
  return (
    <div className={`team-prob ${side}`}>
      <span>{team}</span>
      <strong>{formatPercent(probability)}</strong>
      <em>Pregame {formatPercent(pregameProbability)}</em>
    </div>
  );
}

function SignalCard({ game }: { game: LiveGame }) {
  return (
    <section className={`panel signal-card ${game.action.toLowerCase()}`}>
      <p className="eyebrow">Signal</p>
      <div className="signal-action">{game.action}</div>
      <div className="signal-team">{game.actionTeam || "No active side"}</div>
      <div className="signal-prob">
        {formatPercent(game.actionProb)} / trigger {formatPercent(game.actionThreshold)}
      </div>
      <p>{game.actionReason || "Waiting for the calibrated probability x time trigger."}</p>
    </section>
  );
}

function StatsCard({ game }: { game: LiveGame }) {
  return (
    <section className="panel stats-card">
      <p className="eyebrow">Game State</p>
      <dl>
        <div>
          <dt>Clock</dt>
          <dd>{game.time}</dd>
        </div>
        <div>
          <dt>Kills</dt>
          <dd>{game.scoreline}</dd>
        </div>
        <div>
          <dt>Gold</dt>
          <dd>{game.goldline}</dd>
        </div>
        <div>
          <dt>Towers</dt>
          <dd>{game.towers}</dd>
        </div>
        <div>
          <dt>Dragons</dt>
          <dd>{game.dragons}</dd>
        </div>
        <div>
          <dt>Barons</dt>
          <dd>{game.barons}</dd>
        </div>
      </dl>
    </section>
  );
}

function ProbabilityChart({ points, blueTeam, redTeam }: { points: ProbabilityPoint[]; blueTeam: string; redTeam: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * ratio;
    const height = canvas.clientHeight * ratio;
    canvas.width = width;
    canvas.height = height;
    drawChart(ctx, points, width, height, ratio);
  }, [points]);

  return (
    <div className="chart-wrap">
      <canvas ref={canvasRef} />
      <div className="legend">
        <span className="blue-dot">{blueTeam}</span>
        <span className="red-dot">{redTeam}</span>
      </div>
    </div>
  );
}

function drawChart(ctx: CanvasRenderingContext2D, points: ProbabilityPoint[], width: number, height: number, ratio: number) {
  const padX = 58 * ratio;
  const padY = 30 * ratio;
  const chartWidth = width - padX * 2;
  const chartHeight = height - padY * 2;

  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "rgba(255,255,255,0.08)");
  bg.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  [0.25, 0.5, 0.75].forEach((value) => {
    const y = padY + (1 - value) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(width - padX, y);
    ctx.strokeStyle = value === 0.5 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)";
    ctx.lineWidth = ratio;
    ctx.stroke();
    ctx.fillStyle = "rgba(236,241,255,0.58)";
    ctx.font = `${12 * ratio}px Verdana`;
    ctx.fillText(formatPercent(value), 12 * ratio, y + 4 * ratio);
  });

  drawProbabilityLine(ctx, points, "blueProb", "#5ea1ff", padX, padY, chartWidth, chartHeight, ratio);
  drawProbabilityLine(ctx, points, "redProb", "#ff5f7f", padX, padY, chartWidth, chartHeight, ratio);
}

function drawProbabilityLine(
  ctx: CanvasRenderingContext2D,
  points: ProbabilityPoint[],
  key: "blueProb" | "redProb",
  color: string,
  padX: number,
  padY: number,
  chartWidth: number,
  chartHeight: number,
  ratio: number
) {
  if (!points.length) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = padX + (points.length === 1 ? 0 : (index / (points.length - 1)) * chartWidth);
    const y = padY + (1 - point[key]) * chartHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 4 * ratio;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 10 * ratio;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function EmptyState() {
  return (
    <section className="panel empty-state">
      <h2>No live game selected</h2>
      <p>When the backend sees an LCK game in progress, it will appear here.</p>
    </section>
  );
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "--.-%";
  return `${(value * 100).toFixed(1)}%`;
}

function formatOptionalPercent(value: number | undefined) {
  if (value === undefined) return "pregame pending";
  return `pregame ${formatPercent(value)}`;
}

function formatStart(value: string) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}
