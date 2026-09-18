export interface VideoMetadata {
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  codec: string;
  format: string;
  fileSizeBytes: number;
  frameCount?: number;
}

export interface ExtractedFrame {
  frameIndex: number;
  fileName: string;
  filePath: string;
  timestampMs: number;
}

export interface ExtractFramesOptions {
  sourceVideoPath: string;
  outputDir: string;
  fps?: number;
  frameCount?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ExtractFramesResult {
  frames: ExtractedFrame[];
  frameCount: number;
  fps: number;
  durationMs: number;
  outputDir: string;
}

export interface EncodeTransparentWebmOptions {
  framesDir: string;
  outputWebmPath: string;
  fps: number;
  width?: number;
  height?: number;
  framePattern?: string; // default "frame_%03d.png"
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface EncodeTransparentWebmResult {
  outputWebmPath: string;
  fileSizeBytes: number;
  durationMs: number;
  fps: number;
  codec: string; // "vp9_alpha"
}

export interface EncodeMp4Options {
  inputPath: string;
  outputMp4Path: string;
  fps?: number;
  width?: number;
  height?: number;
  crf?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface EncodeMp4Result {
  outputMp4Path: string;
  fileSizeBytes: number;
  durationMs: number;
  fps: number;
  codec: string; // "h264"
}

export interface SpriteSheetOptions {
  inputFramesPattern: string;
  outputSheetPath: string;
  columns: number;
  rows: number;
  frameWidth?: number;
  frameHeight?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface SpriteSheetResult {
  outputSheetPath: string;
  fileSizeBytes: number;
  columns: number;
  rows: number;
}

export interface ThumbnailOptions {
  sourceVideoPath: string;
  outputThumbnailPath: string;
  timestampMs?: number;
  width?: number;
  height?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ThumbnailResult {
  outputThumbnailPath: string;
  fileSizeBytes: number;
  width: number;
  height: number;
}

export type FixtureExtractHandler = (options: ExtractFramesOptions) => Promise<ExtractFramesResult>;
export type FixtureEncodeWebmHandler = (options: EncodeTransparentWebmOptions) => Promise<EncodeTransparentWebmResult>;

export interface FfmpegAdapterOptions {
  ffprobeBinary?: string;
  ffmpegBinary?: string;
  timeoutMs?: number;
  fixtureMetadata?: VideoMetadata | null;
  fixtureExtractHandler?: FixtureExtractHandler | null;
  fixtureEncodeWebmHandler?: FixtureEncodeWebmHandler | null;
}

export interface FfmpegAdapter {
  probeVideoMetadata: (filePath: string) => Promise<VideoMetadata>;
  extractFrames: (options: ExtractFramesOptions) => Promise<ExtractFramesResult>;
  encodeFramesToTransparentWebm: (options: EncodeTransparentWebmOptions) => Promise<EncodeTransparentWebmResult>;
  encodeMp4Video?: (options: EncodeMp4Options) => Promise<EncodeMp4Result>;
  generateSpriteSheet?: (options: SpriteSheetOptions) => Promise<SpriteSheetResult>;
  generateThumbnail?: (options: ThumbnailOptions) => Promise<ThumbnailResult>;
}

export const DEFAULT_FFPROBE_TIMEOUT_MS = 30_000;
export const DEFAULT_EXTRACT_TIMEOUT_MS = 120_000;
export const DEFAULT_ENCODE_WEBM_TIMEOUT_MS = 300_000;
export const DEFAULT_MEDIA_TIMEOUT_MS = 60_000;
