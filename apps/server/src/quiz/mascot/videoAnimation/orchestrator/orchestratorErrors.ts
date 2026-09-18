/**
 * Error thrown during video processing orchestration operations.
 */
export class OrchestrationError extends Error {
  public readonly code: string;

  constructor(message: string, code = "ORCHESTRATION_ERROR") {
    super(message);
    this.name = "OrchestrationError";
    this.code = code;
  }
}
