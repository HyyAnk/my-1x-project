import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import type { RenderEngineSnapshot } from "../renderEngineSnapshot.js";
import type { RenderInvocation, RenderInvocationPaths } from "../renderInvocationOptions.js";
import { calculateOptimalWorkers, getHyperframesExecutionEnv } from "../videoPerformance.js";

const require = createRequire(import.meta.url);
export function buildResumableRenderInvocation(
  snapshot: RenderEngineSnapshot,
  paths: RenderInvocationPaths,
  canvas: { width: number; height: number },
  configFingerprint: string,
): RenderInvocation {
  const typescript = import.meta.url.endsWith(".ts");
  const worker = fileURLToPath(new URL(`./resumableRenderWorker.${typescript ? "ts" : "js"}`, import.meta.url));
  return {
    command: process.execPath,
    args: [
      ...(typescript ? ["--import", pathToFileURL(require.resolve("tsx/esm")).href] : []),
      worker,
      JSON.stringify({
        renderRoot: paths.renderRoot,
        outputPath: paths.outputPath,
        ...canvas,
        fps: snapshot.fps,
        quality: snapshot.quality,
        workers: paths.workers ?? calculateOptimalWorkers(),
        configFingerprint,
      }),
    ],
    env: { ...getHyperframesExecutionEnv(), PRODUCER_MAX_WORKERS: String(paths.workers ?? calculateOptimalWorkers()) },
    timeoutMs: paths.timeoutMs ?? (Number(process.env.HYPERFRAMES_RENDER_TIMEOUT_MS) || 120 * 60_000),
  };
}
