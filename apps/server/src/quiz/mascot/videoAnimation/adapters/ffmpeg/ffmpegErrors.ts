export class VideoProbeError extends Error {
  public readonly code: string;

  constructor(message: string, code = "CORRUPTED_VIDEO_FILE") {
    super(message);
    this.name = "VideoProbeError";
    this.code = code;
  }
}

export class VideoExtractError extends Error {
  public readonly code: string;

  constructor(message: string, code = "COMMAND_FAILED") {
    super(message);
    this.name = "VideoExtractError";
    this.code = code;
  }
}

export class VideoEncodeError extends Error {
  public readonly code: string;

  constructor(message: string, code = "COMMAND_FAILED") {
    super(message);
    this.name = "VideoEncodeError";
    this.code = code;
  }
}

export class VideoMediaError extends Error {
  public readonly code: string;

  constructor(message: string, code = "COMMAND_FAILED") {
    super(message);
    this.name = "VideoMediaError";
    this.code = code;
  }
}
