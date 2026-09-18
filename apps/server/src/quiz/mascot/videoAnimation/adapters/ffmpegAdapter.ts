import {
  type FfmpegAdapter,
  type FfmpegAdapterOptions,
  type ExtractFramesOptions,
  type EncodeTransparentWebmOptions,
  type EncodeMp4Options,
  type SpriteSheetOptions,
  type ThumbnailOptions,
} from "./ffmpeg/ffmpegTypes.js";
import { probeVideo } from "./ffmpeg/ffmpegProbe.js";
import { extractFrames } from "./ffmpeg/ffmpegExtractor.js";
import { encodeTransparentWebm, encodeMp4Video } from "./ffmpeg/ffmpegTransparentEncoder.js";
import { generateSpriteSheet, generateThumbnail } from "./ffmpeg/ffmpegAtlas.js";

export * from "./ffmpeg/index.js";

export function createFfmpegAdapter(options: FfmpegAdapterOptions = {}): FfmpegAdapter {
  const probeFn = (filePath: string) => probeVideo(filePath, options);

  return {
    probeVideoMetadata: probeFn,
    extractFrames: (extractOptions: ExtractFramesOptions) =>
      extractFrames(extractOptions, {
        ffmpegBinary: options.ffmpegBinary,
        ffprobeBinary: options.ffprobeBinary,
        timeoutMs: options.timeoutMs,
        fixtureExtractHandler: options.fixtureExtractHandler,
        probeFn,
      }),
    encodeFramesToTransparentWebm: (encodeOptions: EncodeTransparentWebmOptions) =>
      encodeTransparentWebm(encodeOptions, {
        ffmpegBinary: options.ffmpegBinary,
        timeoutMs: options.timeoutMs,
        fixtureEncodeWebmHandler: options.fixtureEncodeWebmHandler,
      }),
    encodeMp4Video: (mp4Options: EncodeMp4Options) =>
      encodeMp4Video(mp4Options, {
        ffmpegBinary: options.ffmpegBinary,
        timeoutMs: options.timeoutMs,
      }),
    generateSpriteSheet: (sheetOptions: SpriteSheetOptions) =>
      generateSpriteSheet(sheetOptions, {
        ffmpegBinary: options.ffmpegBinary,
        timeoutMs: options.timeoutMs,
      }),
    generateThumbnail: (thumbOptions: ThumbnailOptions) =>
      generateThumbnail(thumbOptions, {
        ffmpegBinary: options.ffmpegBinary,
        timeoutMs: options.timeoutMs,
      }),
  };
}
