export type RenderImageFormat = "webp" | "jpeg" | "png" | "avif";
export type RequestedRenderImageFormat = RenderImageFormat | "original";

const RASTER_SOURCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".tiff"]);

const TARGET_EXTENSION_FORMATS = new Map<string, RenderImageFormat>([
  [".webp", "webp"],
  [".jpg", "jpeg"],
  [".jpeg", "jpeg"],
  [".avif", "avif"],
  [".png", "png"],
]);

/** Source extensions an "original" request keeps; anything else is re-encoded as JPEG. */
const PRESERVED_SOURCE_FORMATS = new Map<string, RenderImageFormat>([
  [".png", "png"],
  [".webp", "webp"],
  [".avif", "avif"],
]);

const FORMAT_NATIVE_EXTENSIONS: Record<RenderImageFormat, readonly string[]> = {
  webp: [".webp"],
  jpeg: [".jpg", ".jpeg"],
  png: [".png"],
  avif: [".avif"],
};

export function isRasterImageExtension(extension: string): boolean {
  return RASTER_SOURCE_EXTENSIONS.has(extension);
}

/** Explicit format wins; otherwise the target file extension decides, falling back to the source format. */
export function resolveRequestedFormat(
  explicitFormat: RequestedRenderImageFormat | undefined,
  targetExt: string,
): RequestedRenderImageFormat {
  return explicitFormat ?? TARGET_EXTENSION_FORMATS.get(targetExt) ?? "original";
}

export function resolveEffectiveTargetFormat(requestedFormat: RequestedRenderImageFormat, sourceExt: string): RenderImageFormat {
  if (requestedFormat !== "original") return requestedFormat;
  return PRESERVED_SOURCE_FORMATS.get(sourceExt) ?? "jpeg";
}

export function isRasterFormatConversion(input: {
  isRasterImage: boolean;
  format: RenderImageFormat;
  sourceExt: string;
  targetExt: string;
}): boolean {
  if (!input.isRasterImage) return false;
  if (!FORMAT_NATIVE_EXTENSIONS[input.format].includes(input.sourceExt)) return true;
  return input.targetExt !== "" && input.targetExt !== input.sourceExt;
}
