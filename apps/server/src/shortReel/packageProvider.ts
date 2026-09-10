import { ScriptGenerationError } from "./scriptProvider.js";

export const DEFAULT_PACKAGE_TIMEOUT_MS = 60_000;
export const DEFAULT_IMAGE_OPERATION_TIMEOUT_MS = 300_000;
export const MAX_ALLOWED_OPERATION_TIMEOUT_MS = 600_000;

/** Stops awaiting uncooperative providers, propagates a signal, and observes late rejection. */
export async function runBoundedPackageProvider<T>(
  run: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_PACKAGE_TIMEOUT_MS,
  maxTimeoutMs = MAX_ALLOWED_OPERATION_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  let timeout = false;
  const effectiveTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, maxTimeoutMs) : DEFAULT_PACKAGE_TIMEOUT_MS;
  const timer = setTimeout(() => {
    timeout = true;
    controller.abort();
  }, effectiveTimeout);
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
