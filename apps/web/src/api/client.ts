import type { DirectorPlan, QuizAssessment, QuizAssetPlan, QuizTimeline, QuizV2, TaskEvent, VoicePlan } from "@studio/shared";

export type BundleImage = {
  bundle_id: string;
  bundle_number: number;
  variant: number;
  filename: string;
  path: string;
  size: number;
  modified_at: string;
  price_vnd?: number;
  price_breakdown?: Record<string, number>;
  model?: string;
  aspect_ratio?: string;
};

export type QuizV2Stages = Record<
  "research" | "questions" | "director" | "assets" | "voice" | "timeline" | "qa" | "render",
  "not_started" | "ready" | "stale" | "running" | "failed"
>;

export type QuizV2State = {
  quiz: QuizV2 | null;
  director_plan: DirectorPlan | null;
  asset_plan: QuizAssetPlan | null;
  asset_resolution?: { assets: Array<{ asset_id: string; path: string; source: string }> } | null;
  voice_plan: VoicePlan | null;
  timeline: QuizTimeline | null;
  assessment: QuizAssessment | null;
  stages: QuizV2Stages;
};

export type EngineInfoResponse = {
  active_engine: "codex" | "antigravity";
  status: string;
  model: string;
  codex: { status: string; model: string; models: Array<{ id: string; label: string }> };
  antigravity: { status: string; model: string; models: Array<{ id: string; label: string }> };
};

export type RealtimeStatus = "connecting" | "connected" | "reconnecting";

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  if (init?.body !== undefined && init.body !== null && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(url, { ...init, headers });
  const rawBody = await response.text();
  let body: unknown = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    body = {};
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : rawBody.trim() || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  return body as T;
}

export function subscribeEvents(
  onEvent: (event: TaskEvent) => void,
  onStatus: (status: RealtimeStatus) => void = () => undefined,
): () => void {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  let socket: WebSocket | null = null;
  let retryTimer: number | null = null;
  let retryCount = 0;
  let stopped = false;

  const scheduleReconnect = () => {
    if (stopped || retryTimer !== null) return;
    onStatus("reconnecting");
    const delay = Math.min(1000 * 2 ** retryCount, 10_000);
    retryCount += 1;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  };
  const connect = () => {
    if (stopped) return;
    if (retryCount === 0) onStatus("connecting");
    socket = new WebSocket(`${protocol}://${window.location.host}/api/events`);
    socket.addEventListener("open", () => {
      retryCount = 0;
      onStatus("connected");
    });
    socket.addEventListener("message", (event) => {
      try {
        onEvent(JSON.parse(event.data as string) as TaskEvent);
      } catch {
        /* ignore malformed events */
      }
    });
    socket.addEventListener("close", scheduleReconnect);
    socket.addEventListener("error", () => socket?.close());
  };
  const reconnectWhenOnline = () => {
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    retryTimer = null;
    connect();
  };

  window.addEventListener("online", reconnectWhenOnline);
  connect();
  return () => {
    stopped = true;
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    window.removeEventListener("online", reconnectWhenOnline);
    socket?.close();
  };
}
