import { ScriptGenerationError } from "./scriptProvider.js";

/** Stops awaiting uncooperative providers, propagates a signal, and observes late rejection. */
export async function runBoundedPackageProvider<T>(
  run: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
  timeoutMs = 60_000,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  let timeout = false;
  const timer = setTimeout(
    () => {
      timeout = true;
      controller.abort();
    },
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 60_000) : 60_000,
  );
  const error = () =>
    new ScriptGenerationError(
      timeout ? "TIMEOUT" : "ABORTED",
      timeout ? "Package generation timed out." : "Package generation was cancelled.",
    );
  let onAbort = () => {};
  try {
    if (signal?.aborted) controller.abort();
    if (controller.signal.aborted) throw error();
    const aborted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(error());
      controller.signal.addEventListener("abort", onAbort, { once: true });
    });
    const result = await Promise.race([run(controller.signal), aborted]);
    if (controller.signal.aborted) throw error();
    return result;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
  }
}
