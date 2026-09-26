import { fork } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { MattingOptions } from "../../../../utils/imageMatting.js";
import type { MatteFrameResult } from "./mascotMattingAdapter.js";
import type { MattingSession, MattingWorkerResponse } from "./mattingWorker.types.js";

/** One isolated CPU worker per attempt; cancellation kills computation, not just its promise. */
export function createMattingWorkerSession(signal?: AbortSignal, defaults?: MattingOptions): MattingSession {
  signal?.throwIfAborted();
  const typescript = import.meta.url.endsWith(".ts");
  const require = createRequire(import.meta.url);
  const child = fork(fileURLToPath(new URL(`./mattingWorker.${typescript ? "ts" : "js"}`, import.meta.url)), [], {
    execArgv: typescript ? ["--import", pathToFileURL(require.resolve("tsx/esm")).href] : [],
    serialization: "advanced",
    ...{ windowsHide: true },
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  const pending = new Map<number, { resolve: (value: MatteFrameResult) => void; reject: (error: Error) => void }>();
  let sequence = 0;
  let stopped: Error | undefined;
  let exited = false;
  let finishExit!: () => void;
  const exit = new Promise<void>((resolve) => {
    finishExit = resolve;
  });
  const stop = (error: Error) => {
    stopped ??= error;
    if (!exited) child.kill();
  };
  const abort = () => stop(new Error("Frame matting was cancelled"));
  const timer = setTimeout(() => stop(new Error("Frame matting timed out; retry this video")), 300_000);
  child.on("message", (message: MattingWorkerResponse) => {
    if (stopped) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if ("error" in message) request?.reject(Object.assign(new Error(message.error.message), { code: message.error.code }));
    else request?.resolve(message.result);
    timer.refresh();
  });
  child.once("error", (error) => stop(error));
  child.once("close", (code) => {
    exited = true;
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    stopped ??= new Error(`Matting worker exited unexpectedly (${code})`);
    for (const request of pending.values()) request.reject(stopped);
    pending.clear();
    finishExit();
  });
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  return {
    matteFrame: (input) =>
      new Promise((resolve, reject) => {
        if (stopped) {
          reject(stopped);
          return;
        }
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        child.send({ id, input: { ...input, options: input.options ?? defaults } }, (error) => {
          if (error) stop(error);
        });
      }),
    close: async () => {
      stop(new Error("Matting session closed"));
      await exit;
    },
  };
}
