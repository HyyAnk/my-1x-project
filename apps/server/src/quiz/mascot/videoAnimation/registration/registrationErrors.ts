export class FrameRegistrationError extends Error {
  public readonly code: string;

  constructor(message: string, code = "REGISTRATION_CALCULATION_FAILED") {
    super(message);
    this.name = "FrameRegistrationError";
    this.code = code;
  }
}
