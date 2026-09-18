/**
 * Error class representing failures during animation packaging and manifest processing.
 */
export class AnimationPackagingError extends Error {
  public readonly code: string;

  constructor(message: string, code = "PACKAGING_FAILED") {
    super(message);
    this.name = "AnimationPackagingError";
    this.code = code;
  }
}
