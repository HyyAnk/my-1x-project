import { executeSinglePromptText, type LLMClient } from "../utils/promptSanitizer.js";

export type ScriptGenerationErrorCode = "ABORTED" | "TIMEOUT" | "PROVIDER_ERROR" | "PARSE_ERROR" | "VALIDATION_FAILED";

export class ScriptGenerationError extends Error {
  constructor(
    public readonly code: ScriptGenerationErrorCode,
    message: string,
    public readonly validationErrors?: string[],
  ) {
    super(message);
    this.name = "ScriptGenerationError";
  }
}

/** Bounds the entire adapter call, including connection and providers ignoring the signal. */
export async function requestScriptText(
  client: LLMClient,
  prompt: string,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const failure = () =>
    new ScriptGenerationError(
      timedOut ? "TIMEOUT" : "ABORTED",
      timedOut ? "Script generation timed out. Retry generation." : "Script generation was aborted.",
    );
  let onAbort: () => void = () => {};
  try {
    if (signal?.aborted) controller.abort();
    if (controller.signal.aborted) throw failure();
    const interrupted = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(failure());
      controller.signal.addEventListener("abort", onAbort, { once: true });
    });
    const output = await Promise.race([executeSinglePromptText(client, prompt, { signal: controller.signal, timeoutMs }), interrupted]);
    if (controller.signal.aborted) throw failure();
    return output;
  } catch (error) {
    if (controller.signal.aborted) throw failure();
    if (error instanceof ScriptGenerationError) throw error;
    if (error instanceof Error && /timeout|timed out/i.test(error.message)) {
      throw new ScriptGenerationError("TIMEOUT", "Script generation timed out. Retry generation.");
    }
    throw new ScriptGenerationError("PROVIDER_ERROR", "Script provider is unavailable. Retry generation.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", onAbort);
  }
}
