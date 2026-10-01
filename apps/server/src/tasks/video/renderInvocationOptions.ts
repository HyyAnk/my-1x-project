import type { RenderEngineSnapshot } from "./renderEngineSnapshot.js";
import { getHyperframesInvocation } from "./videoInvocation.js";
import { calculateOptimalWorkers, getHyperframesExecutionEnv } from "./videoPerformance.js";

export type RenderInvocationPaths = {
  renderRoot: string;
  outputPath: string;
  workers?: number;
  browserTimeoutSeconds?: number;
  timeoutMs?: number;
  /** Override capture routing for compositions that are unsafe for experimental capture. */
  forceScreenshot?: boolean;
  useDrawElement?: boolean;
};

export type RenderInvocation = {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
};

export function buildRenderInvocation(snapshot: RenderEngineSnapshot, paths: RenderInvocationPaths): RenderInvocation {
  const browserTimeout = String(paths.browserTimeoutSeconds ?? process.env.HYPERFRAMES_BROWSER_TIMEOUT_SECONDS ?? 300);
  const timeoutMs = paths.timeoutMs ?? (Number(process.env.HYPERFRAMES_RENDER_TIMEOUT_MS) || 120 * 60_000);
  const workers = paths.workers !== undefined ? paths.workers : calculateOptimalWorkers();
  const env = {
    ...getHyperframesExecutionEnv(),
    ...(paths.forceScreenshot === undefined ? {} : { PRODUCER_FORCE_SCREENSHOT: String(paths.forceScreenshot) }),
    ...(paths.useDrawElement === undefined ? {} : { PRODUCER_EXPERIMENTAL_FAST_CAPTURE: String(paths.useDrawElement) }),
  };

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
