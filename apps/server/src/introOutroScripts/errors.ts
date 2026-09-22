export class IntroOutroScriptError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "IntroOutroScriptError";
  }
}

export function describeScriptError(error: unknown): { code: string; message: string } {
  if (error instanceof IntroOutroScriptError) return { code: error.code, message: error.message };
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return { code: String(error.code), message: String(error.message) };
  }
  return { code: "SCRIPT_GENERATION_FAILED", message: error instanceof Error ? error.message : String(error) };
}
