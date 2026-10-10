import type { TaskManagerRuntime } from "./runtime.js";

/**
 * Connects the active engine and, for Antigravity, confirms a live IDE session. Started alongside
 * context assembly so an unreachable engine is reported right away instead of after the context work.
 * The returned promise is pre-observed so a failure is never reported as an unhandled rejection
 * when the caller exits early; awaiting it still rethrows.
 */
export function startEnginePreflight(runtime: TaskManagerRuntime): Promise<void> {
  const antigravity = runtime.activeEngine === "antigravity" ? runtime.antigravity : undefined;
  const preflight = antigravity ? antigravity.connect().then(() => antigravity.ensureSessionReady()) : runtime.codex.connect();
  preflight.catch(() => undefined);
  return preflight;
}
