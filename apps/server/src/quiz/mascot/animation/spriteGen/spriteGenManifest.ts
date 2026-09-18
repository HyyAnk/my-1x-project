import path from "node:path";
import {
  FRAME_DURATION_MS,
  MascotAnimationManifestSchema,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  type AnimationState,
  type MascotAnimationManifest,
  type MascotAssetRegistration,
  type MascotFrameRect,
} from "@studio/shared";

export type ManifestErrorCode =
  "INVALID_JSON" | "SCHEMA_VIOLATION" | "FRAME_COUNT_MISMATCH" | "UNSAFE_PATH" | "OUT_OF_BOUNDS_FRAME" | "INVALID_GEOMETRY";

export class SpriteGenManifestError extends Error {
  public readonly code: ManifestErrorCode;

  constructor(message: string, code: ManifestErrorCode) {
    super(message);
    this.name = "SpriteGenManifestError";
    this.code = code;
  }
}

export interface ParsedSpriteGenManifest {
  manifest: MascotAnimationManifest;
  atlasAbsolutePath: string;
  registration: MascotAssetRegistration;
  frames: MascotFrameRect[];
}

interface NativeSpriteGenFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface NativeSpriteGenAnimRow {
  fps?: number;
  loop?: boolean;
  durations_ms?: number[];
}

interface NativeSpriteGenManifestInput {
  characterId?: string;
  fingerprint?: string;
  content_fingerprint?: string;
  sprite_sheet_alpha?: string;
  cell?: {
    width?: number;
    height?: number;
  };
  frame_layout?: {
    rows?: Record<string, NativeSpriteGenFrame[]>;
    sheetWidth?: number;
    sheetHeight?: number;
  };
  animation?: {
    rows?: Record<string, NativeSpriteGenAnimRow>;
  };
}

function isNativeSpriteGenManifest(raw: unknown): raw is NativeSpriteGenManifestInput {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  const layout = obj.frame_layout;
  return typeof layout === "object" && layout !== null && typeof (layout as Record<string, unknown>).rows === "object";
}

function resolveMatchedKey(rows: Record<string, NativeSpriteGenFrame[]>, contextState?: AnimationState): string {
  if (contextState && rows[contextState]) {
    return contextState;
  }
  const keys = Object.keys(rows);
  return keys[0] || "thinking";
}

function buildMappedFrames(rawFrames: NativeSpriteGenFrame[], animRow?: NativeSpriteGenAnimRow): MascotFrameRect[] {
  return rawFrames.map((f, i) => ({
    index: i,
    x: f.x,
    y: f.y,
    width: f.w,
    height: f.h,
    duration_ms: animRow?.durations_ms?.[i] ?? FRAME_DURATION_MS,
  }));
}

function buildNativeRegistration(cellSize: number): MascotAssetRegistration {
  return {
    source_width: cellSize,
    source_height: cellSize,
    content_bounds: {
      x: 0,
      y: 0,
      width: cellSize,
      height: cellSize,
    },
    pivot: {
      x: Math.round(cellSize / 2),
      y: cellSize,
    },
    offset_x: 0,
    offset_y: 0,
  };
}

function resolveNativeAtlas(raw: NativeSpriteGenManifestInput, rawFramesLength: number) {
  const cellW = raw.cell?.width ?? 512;
  const cellH = raw.cell?.height ?? 512;
  const sheetWidth = raw.frame_layout?.sheetWidth ?? rawFramesLength * cellW;
  const sheetHeight = raw.frame_layout?.sheetHeight ?? cellH;
  return {
    file_path: raw.sprite_sheet_alpha ?? "atlas.png",
    width: sheetWidth,
    height: sheetHeight,
  };
}

function resolveNativeMeta(raw: NativeSpriteGenManifestInput, matchedKey: string, context?: { state?: AnimationState; recipeId?: string }) {
  const state = context?.state ?? (matchedKey === "celebrate" ? "celebrate" : "thinking");
  const recipeId = context?.recipeId ?? raw.characterId ?? "recipe";
  const loopPolicy = state === "celebrate" ? ("one_shot_rest" as const) : ("loop" as const);
  const fingerprint = raw.fingerprint ?? raw.content_fingerprint ?? "native_fingerprint";
  return { state, recipeId, loopPolicy, fingerprint };
}

function normalizeNativeSpriteGenManifest(raw: unknown, context?: { state?: AnimationState; recipeId?: string }): unknown {
  if (!isNativeSpriteGenManifest(raw)) {
    return raw;
  }

  const rows = raw.frame_layout?.rows ?? {};
  const matchedKey = resolveMatchedKey(rows, context?.state);
  const rawFrames = rows[matchedKey] ?? [];
  const animRow = raw.animation?.rows?.[matchedKey];
  const frames = buildMappedFrames(rawFrames, animRow);

  const cellSize = raw.cell?.width ?? 256;
  const atlas = resolveNativeAtlas(raw, rawFrames.length);
  const { state, recipeId, loopPolicy, fingerprint } = resolveNativeMeta(raw, matchedKey, context);

  return {
    version: 1,
    state,
    recipe_id: recipeId,
    frame_count: frames.length,
    fps: animRow?.fps ?? REQUIRED_FPS,
    loop: animRow?.loop ?? true,
    loop_policy: loopPolicy,
    atlas,
    frames,
    registration: buildNativeRegistration(cellSize),
    fingerprint,
  };
}

export function parseSpriteGenManifest(
  rawJson: string | Record<string, unknown>,
  outputDir: string,
  context?: { state?: AnimationState; recipeId?: string },
): ParsedSpriteGenManifest {
  const normalizedOutputDir = path.resolve(outputDir);
  let parsed: unknown;

  if (typeof rawJson === "string") {
    try {
      parsed = JSON.parse(rawJson);
    } catch (err) {
      throw new SpriteGenManifestError(
        `Failed to parse manifest JSON: ${err instanceof Error ? err.message : String(err)}`,
        "INVALID_JSON",
      );
    }
  } else {
    parsed = rawJson;
  }

  const normalized = normalizeNativeSpriteGenManifest(parsed, context);
  const result = MascotAnimationManifestSchema.safeParse(normalized);
  if (!result.success) {
    const errorDetails = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    const isFrameCountIssue = result.error.errors.some((e) => e.path.includes("frame_count") || e.path.includes("frames"));
    throw new SpriteGenManifestError(
      `Manifest schema validation failed: ${errorDetails}`,
      isFrameCountIssue ? "FRAME_COUNT_MISMATCH" : "SCHEMA_VIOLATION",
    );
  }

  const manifest = result.data;

  if (manifest.frame_count !== REQUIRED_FRAME_COUNT) {
    throw new SpriteGenManifestError(
      `SpriteGen manifests must have exactly ${REQUIRED_FRAME_COUNT} frames, found ${manifest.frame_count}`,
      "FRAME_COUNT_MISMATCH",
    );
  }

  if (!manifest.atlas || !manifest.frames) {
    throw new SpriteGenManifestError("Sprite generation manifest must include atlas and frames", "SCHEMA_VIOLATION");
  }

  // Verify safe atlas file path
  const atlasRelativePath = manifest.atlas.file_path ?? "atlas.png";
  validateSafePath(atlasRelativePath, normalizedOutputDir);

  const atlasAbsolutePath = path.resolve(normalizedOutputDir, atlasRelativePath);

  // Validate geometry of declared frames against atlas bounds
  validateFrameGeometry(manifest.frames, manifest.atlas.width, manifest.atlas.height);

  // Derive registration and pivot (default bottom-center if not explicitly set)
  const registration = deriveRegistration(manifest);

  return {
    manifest,
    atlasAbsolutePath,
    registration,
    frames: manifest.frames,
  };
}

function validateSafePath(filePath: string, allowedDir: string): void {
  // Reject directory traversal
  if (filePath.includes("..")) {
    throw new SpriteGenManifestError(`Unsafe path detected (path traversal not allowed): ${filePath}`, "UNSAFE_PATH");
  }

  // Enforce png extension
  if (!filePath.toLowerCase().endsWith(".png")) {
    throw new SpriteGenManifestError(`Unsafe or invalid atlas file format (must be .png): ${filePath}`, "UNSAFE_PATH");
  }

  // Reject paths that escape allowed directory
  const resolved = path.resolve(allowedDir, filePath);
  const relative = path.relative(allowedDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new SpriteGenManifestError(`Unsafe path escapes target output directory: ${filePath}`, "UNSAFE_PATH");
  }
}

function validateFrameGeometry(frames: MascotFrameRect[], atlasWidth: number, atlasHeight: number): void {
  for (const frame of frames) {
    if (frame.width <= 0 || frame.height <= 0) {
      throw new SpriteGenManifestError(`Frame ${frame.index} has invalid dimensions (${frame.width}x${frame.height})`, "INVALID_GEOMETRY");
    }

    if (frame.x < 0 || frame.y < 0 || frame.x + frame.width > atlasWidth || frame.y + frame.height > atlasHeight) {
      throw new SpriteGenManifestError(
        `Frame ${frame.index} (${frame.x}, ${frame.y}, ${frame.width}x${frame.height}) exceeds atlas bounds (${atlasWidth}x${atlasHeight})`,
        "OUT_OF_BOUNDS_FRAME",
      );
    }
  }
}

function deriveRegistration(manifest: MascotAnimationManifest): MascotAssetRegistration {
  const reg = manifest.registration;
  const contentBounds = reg.content_bounds;

  // Use declared pivot or derive bottom-center of content bounds
  const pivot =
    reg.pivot && reg.pivot.x !== undefined && reg.pivot.y !== undefined
      ? reg.pivot
      : {
          x: Math.round(contentBounds.x + contentBounds.width / 2),
          y: Math.round(contentBounds.y + contentBounds.height),
        };

  return {
    source_width: reg.source_width,
    source_height: reg.source_height,
    content_bounds: {
      x: contentBounds.x,
      y: contentBounds.y,
      width: contentBounds.width,
      height: contentBounds.height,
    },
    pivot,
    offset_x: reg.offset_x ?? 0,
    offset_y: reg.offset_y ?? 0,
  };
}
