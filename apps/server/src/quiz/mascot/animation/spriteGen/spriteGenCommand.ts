import path from "node:path";
import {
  CANONICAL_PIPELINE_STEPS,
  FRAME_DURATION_MS,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  SUPPORTED_PROVIDER,
  type SpriteGenArtifactPaths,
  type SpriteGenCommandConfig,
  type SpriteGenCommandShape,
  type SpriteGenPipelineStep,
  type SpriteGenValidationResult,
} from "./spriteGenTypes.js";

export function buildSpriteGenArtifactPaths(outputDir: string): SpriteGenArtifactPaths {
  const normalized = path.normalize(outputDir);
  return {
    requestJsonPath: path.join(normalized, "request.json"),
    rawFramesDir: path.join(normalized, "frames_raw"),
    curatedFramesDir: path.join(normalized, "frames_curated"),
    atlasPath: path.join(normalized, "atlas.png"),
    manifestPath: path.join(normalized, "manifest.json"),
    qaReportPath: path.join(normalized, "qa_report.json"),
  };
}

export function buildSpriteGenRequestJson(config: SpriteGenCommandConfig): Record<string, unknown> {
  const provider = config.provider ?? SUPPORTED_PROVIDER;
  return {
    version: 1,
    provider,
    style_anchor: config.styleAnchorPath,
    recipe_id: config.recipeId,
    prompt: config.prompt,
    frame_count: config.frameCount,
    fps: config.fps,
    duration_per_frame_ms: FRAME_DURATION_MS,
    loop: config.loop,
    cell_dimensions: {
      width: config.cellWidth,
      height: config.cellHeight,
    },
    margin: config.margin,
    chroma_key: config.chromaKey,
    fit: config.fit,
  };
}

export function buildSpriteGenCommandShape(config: SpriteGenCommandConfig, executableOverride?: string): SpriteGenCommandShape {
  const artifactPaths = buildSpriteGenArtifactPaths(config.outputDir);
  const requestJson = buildSpriteGenRequestJson(config);
  const provider = config.provider ?? SUPPORTED_PROVIDER;

  const args: string[] = [
    "pipeline",
    "--request",
    artifactPaths.requestJsonPath,
    "--output-dir",
    config.outputDir,
    "--provider",
    provider,
    "--frames",
    String(config.frameCount),
    "--fps",
    String(config.fps),
    "--cell-size",
    `${config.cellWidth}x${config.cellHeight}`,
    "--margin",
    String(config.margin),
    "--chroma-key",
    config.chromaKey,
    "--fit",
    config.fit,
    config.loop ? "--loop" : "--no-loop",
    "--pipeline-steps",
    CANONICAL_PIPELINE_STEPS.join(","),
    "--ffmpeg-free",
  ];

  return {
    executable: executableOverride || "sprite-gen",
    args,
    requestJson,
    artifactPaths,
    pipelineSteps: CANONICAL_PIPELINE_STEPS,
    ffmpegRequired: false,
    provider,
  };
}

export function validateSpriteGenCommandShape(shape: SpriteGenCommandShape): SpriteGenValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  validateFrameRequirements(shape, errors);
  validateProviderRequirements(shape, errors);
  validatePipelineSafety(shape, errors);
  validateArtifactPaths(shape.artifactPaths, errors);
  validateCellDimensions(shape.requestJson, errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateFrameRequirements(shape: SpriteGenCommandShape, errors: string[]): void {
  const frameCount = Number(shape.requestJson.frame_count);
  if (frameCount !== REQUIRED_FRAME_COUNT) {
    errors.push(`Invalid frame count: expected exactly ${REQUIRED_FRAME_COUNT} frames, got ${frameCount}`);
  }

  const fps = Number(shape.requestJson.fps);
  if (fps !== REQUIRED_FPS) {
    errors.push(`Invalid FPS: expected exactly ${REQUIRED_FPS} FPS, got ${fps}`);
  }
}

function validateProviderRequirements(shape: SpriteGenCommandShape, errors: string[]): void {
  const provider = shape.provider.toLowerCase();
  if (provider === "grok" || provider.includes("video")) {
    errors.push(`Prohibited provider '${shape.provider}': Grok and video-to-loop providers are forbidden`);
  }
  if (provider !== SUPPORTED_PROVIDER) {
    errors.push(`Unsupported provider '${shape.provider}': must use '${SUPPORTED_PROVIDER}'`);
  }
}

function validatePipelineSafety(shape: SpriteGenCommandShape, errors: string[]): void {
  if (shape.ffmpegRequired) {
    errors.push("FFmpeg dependency violation: sprite-gen pipeline must be ffmpeg-free");
  }

  const requiredSteps: readonly SpriteGenPipelineStep[] = ["gen-set", "extract", "compose-atlas", "score", "import"];
  for (const step of requiredSteps) {
    if (!shape.pipelineSteps.includes(step)) {
      errors.push(`Missing required pipeline step: ${step}`);
    }
  }
}

function validateArtifactPaths(paths: SpriteGenArtifactPaths, errors: string[]): void {
  if (!paths.atlasPath.endsWith(".png")) {
    errors.push("Invalid atlas path: must end with .png");
  }
  if (!paths.manifestPath.endsWith(".json")) {
    errors.push("Invalid manifest path: must end with .json");
  }
  if (!paths.qaReportPath.endsWith(".json")) {
    errors.push("Invalid QA report path: must end with .json");
  }
  if (!paths.requestJsonPath.endsWith(".json")) {
    errors.push("Invalid request JSON path: must end with .json");
  }
}

function validateCellDimensions(requestJson: Record<string, unknown>, errors: string[]): void {
  const dims = requestJson.cell_dimensions as { width?: number; height?: number } | undefined;
  if (!dims || typeof dims.width !== "number" || typeof dims.height !== "number" || dims.width <= 0 || dims.height <= 0) {
    errors.push("Invalid cell dimensions: width and height must be positive numbers");
  }
}
