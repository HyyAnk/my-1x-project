const ANSI_ESCAPE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g");
const TRACE_PREFIX = "[Render:trace]";
const FALLBACK_FRAME_PATTERN = /(?:Streaming|Rendering|Render)?\s*frames?\s+(\d+)\s*(?:\/|of)\s*(\d+)(?:\s*\((\d+)\s+workers?\))?/i;

export type HyperframesProgressSample = {
  phase: "capture_streaming";
  framesCompleted: number;
  totalFrames: number;
  workerCount: number;
  elapsedMs: number | null;
  etaSeconds: number | null;
};

type TracePayload = {
  phase?: unknown;
  framesCompleted?: unknown;
  totalFrames?: unknown;
  workerCount?: unknown;
  stageElapsedMs?: unknown;
};

function asNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function asPositiveInteger(value: unknown): number | null {
  const parsed = asNonNegativeInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function createSample(payload: TracePayload): HyperframesProgressSample | null {
  if (payload.phase !== "capture_streaming") return null;
  const framesCompleted = asNonNegativeInteger(payload.framesCompleted);
  const totalFrames = asPositiveInteger(payload.totalFrames);
  const workerCount = asPositiveInteger(payload.workerCount);
  if (framesCompleted === null || totalFrames === null || workerCount === null) return null;

  const boundedFrames = Math.min(framesCompleted, totalFrames);
  const elapsedMs = asNonNegativeInteger(payload.stageElapsedMs);
  const remainingRatio = boundedFrames > 0 ? (totalFrames - boundedFrames) / boundedFrames : null;
  const etaSeconds = elapsedMs !== null && remainingRatio !== null ? Math.max(0, Math.round((elapsedMs * remainingRatio) / 1000)) : null;

  return { phase: "capture_streaming", framesCompleted: boundedFrames, totalFrames, workerCount, elapsedMs, etaSeconds };
}

function parseTrace(line: string): HyperframesProgressSample | null {
  const prefixIndex = line.indexOf(TRACE_PREFIX);
  if (prefixIndex < 0) return null;
  try {
    return createSample(JSON.parse(line.slice(prefixIndex + TRACE_PREFIX.length).trim()) as TracePayload);
  } catch {
    return null;
  }
}

function parseFallback(line: string): HyperframesProgressSample | null {
  const match = FALLBACK_FRAME_PATTERN.exec(line);
  if (!match) return null;
  const framesCompleted = Number(match[1]);
  const totalFrames = Number(match[2]);
  const workerCount = match[3] ? Number(match[3]) : 1;
  return createSample({
    phase: "capture_streaming",
    framesCompleted,
    totalFrames,
    workerCount,
  });
}

export function parseHyperframesProgress(line: string): HyperframesProgressSample | null {
  const normalized = line.replace(ANSI_ESCAPE_PATTERN, "").replace(/\r/g, "").trim();
  return parseTrace(normalized) ?? parseFallback(normalized);
}

export function mapRenderTaskPercent(sample: HyperframesProgressSample): number {
  const captureRatio = sample.framesCompleted / sample.totalFrames;
  const hyperframesPercent = 25 + captureRatio * 55;
  return Math.round((65 + hyperframesPercent * 0.3) * 100) / 100;
}
