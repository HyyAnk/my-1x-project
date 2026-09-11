import type { RenderEngineSnapshot } from "./renderEngineSnapshot.js";
import { getHyperframesInvocation } from "./videoInvocation.js";
import { calculateOptimalWorkers, getHyperframesExecutionEnv } from "./videoPerformance.js";

export type RenderInvocationPaths = {
  renderRoot: string;
  outputPath: string;
  workers?: number;
  browserTimeoutSeconds?: number;
  timeoutMs?: number;
};

export type RenderInvocation = {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
};

export function buildRenderInvocation(
  snapshot: RenderEngineSnapshot,
  paths: RenderInvocationPaths,
): RenderInvocation {
  const browserTimeout = String(paths.browserTimeoutSeconds ?? process.env.HYPERFRAMES_BROWSER_TIMEOUT_SECONDS ?? 300);
  const timeoutMs = paths.timeoutMs ?? (Number(process.env.HYPERFRAMES_RENDER_TIMEOUT_MS) || 120 * 60_000);
  const workers = paths.workers !== undefined ? paths.workers : calculateOptimalWorkers();
  const env = getHyperframesExecutionEnv();

  const extraArgs: string[] = [];
  if (snapshot.gpu) extraArgs.push("--gpu");
  if (snapshot.browserGpu) extraArgs.push("--browser-gpu");

  const invocation = getHyperframesInvocation(
    "render",
    paths.renderRoot,
    "--output",
    paths.outputPath,
    "--fps",
    String(snapshot.fps),
    "--quality",
    snapshot.quality,
    "--workers",
    String(workers),
    ...extraArgs,
    "--browser-timeout",
    browserTimeout,
    "--strict",
    "--json",
  );

  return {
    command: invocation.command,
    args: invocation.args,
    env,
    timeoutMs,
  };
}
