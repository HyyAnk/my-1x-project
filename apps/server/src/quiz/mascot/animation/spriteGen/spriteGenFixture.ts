import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  computeAnimationContentFingerprint,
  type MascotAnimationManifest,
  type MascotAssetRegistration,
  type MascotFrameRect,
} from "@studio/shared";
import sharp from "sharp";
import {
  FRAME_DURATION_MS,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  type SpriteGenExecutionRequest,
  type SpriteGenLogContext,
  type SpriteGenLogEntry,
} from "./spriteGenTypes.js";

export interface FixtureGenerationResult {
  atlasPath: string;
  manifestPath: string;
  qaReportPath: string;
  requestJsonPath: string;
  logs: SpriteGenLogEntry[];
}

export async function generateSpriteGenFixtures(request: SpriteGenExecutionRequest): Promise<FixtureGenerationResult> {
  const outputDir = path.resolve(request.outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  const logContext: SpriteGenLogContext = {
    jobId: request.jobId,
    mascotId: request.mascotId,
    styleId: request.styleId,
    state: request.state,
    slot: request.slot,
    attempt: request.attempt ?? 1,
    step: "compose-atlas",
  };

  const logs: SpriteGenLogEntry[] = [
    {
      timestamp: new Date().toISOString(),
      level: "info",
      message: `[FixtureMode] Generating deterministic synthetic fixtures in ${outputDir}`,
      stream: "system",
      context: logContext,
    },
  ];

  const cellWidth = request.cellWidth ?? 128;
  const cellHeight = request.cellHeight ?? 128;
  const cols = 4;
  const rows = 3;
  const totalWidth = cellWidth * cols;
  const totalHeight = cellHeight * rows;

  // Render SVG atlas with 12 distinct sequential cells
  const svgCells = Array.from({ length: REQUIRED_FRAME_COUNT }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellWidth;
    const y = row * cellHeight;
    const hue = Math.round((i / REQUIRED_FRAME_COUNT) * 360);
    const radius = Math.round(cellWidth * 0.3 + (i % 3) * 4);
    const cx = x + Math.round(cellWidth / 2);
    const cy = y + Math.round(cellHeight / 2);

    return `
      <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="#00FF00" opacity="0.1" />
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="hsl(${hue}, 80%, 55%)" />
      <text x="${cx}" y="${cy + 5}" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">F${i + 1}</text>
    `;
  }).join("\n");

  const svgContent = `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${totalWidth}" height="${totalHeight}" fill="#00000000" />
    ${svgCells}
  </svg>`;

  const atlasPath = path.join(outputDir, "atlas.png");
  await sharp(Buffer.from(svgContent)).png().toFile(atlasPath);

  const atlasBuffer = await fs.readFile(atlasPath);
  const atlasChecksum = crypto.createHash("sha256").update(atlasBuffer).digest("hex");

  const frames: MascotFrameRect[] = Array.from({ length: REQUIRED_FRAME_COUNT }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      index,
      x: col * cellWidth,
      y: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
      duration_ms: FRAME_DURATION_MS,
    };
  });

  const registration: MascotAssetRegistration = {
    source_width: cellWidth,
    source_height: cellHeight,
    content_bounds: {
      x: Math.round(cellWidth * 0.1),
      y: Math.round(cellHeight * 0.1),
      width: Math.round(cellWidth * 0.8),
      height: Math.round(cellHeight * 0.8),
    },
    pivot: {
      x: Math.round(cellWidth / 2),
      y: cellHeight,
    },
    offset_x: 0,
    offset_y: 0,
  };

  const contentFingerprint = computeAnimationContentFingerprint({
    recipeId: request.recipeId,
    atlasChecksumOrUrl: atlasChecksum,
    frames,
    registration,
    sourceFingerprint: request.sourceFingerprint,
  });

  const manifest: MascotAnimationManifest = {
    version: 1,
    state: request.state,
    recipe_id: request.recipeId,
    slot_index: request.slot,
    frame_count: REQUIRED_FRAME_COUNT,
    fps: REQUIRED_FPS,
    loop: request.loop ?? true,
    loop_policy: (request.loop ?? true) ? "loop" : "one_shot_rest",
    atlas: {
      file_path: "atlas.png",
      width: totalWidth,
      height: totalHeight,
      cols,
      rows,
    },
    frames,
    registration,
    fingerprint: contentFingerprint,
    source_fingerprint: request.sourceFingerprint,
    curation: {
      reviewed: true,
      approved: true,
      reviewed_by: "fixture-generator",
      reviewed_at: new Date().toISOString(),
      rating: 5,
      selection_tag: "fixture-verified",
    },
  };

  const manifestPath = path.join(outputDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const qaReport = {
    version: 1,
    job_id: request.jobId,
    passed: true,
    score: 0.99,
    timestamp: new Date().toISOString(),
    checks: {
      frame_count: { passed: true, score: 1.0, message: "Valid 12 frames" },
      fps: { passed: true, score: 1.0 },
      bounds: { passed: true, score: 1.0, message: "Within atlas bounds" },
      alpha_coverage: { passed: true, score: 0.95, message: "Alpha coverage within acceptable range" },
      duplicate_pose: { passed: true, score: 1.0, message: "No duplicate poses detected" },
      motion_difference: { passed: true, score: 0.92, message: "Adequate motion difference across frames" },
      seam: { passed: true, score: 0.98, message: "Clean seam return-to-rest" },
      fingerprint_consistency: { passed: true, score: 1.0 },
      duration_per_frame_ms: FRAME_DURATION_MS,
      total_duration_ms: REQUIRED_FRAME_COUNT * FRAME_DURATION_MS,
      seams_detected: false,
      motion_smoothness: "pass",
      identity_preservation: "pass",
    },
    summary: {
      state: request.state,
      recipe_id: request.recipeId,
      frame_count: REQUIRED_FRAME_COUNT,
      fps: REQUIRED_FPS,
      average_alpha_ratio: 0.85,
      duplicate_ratio: 0.0,
      motion_score: 0.92,
      seam_difference: 0.02,
      content_fingerprint: contentFingerprint,
    },
  };

  const qaReportPath = path.join(outputDir, "qa_report.json");
  await fs.writeFile(qaReportPath, JSON.stringify(qaReport, null, 2), "utf8");

  const requestJsonPath = path.join(outputDir, "request.json");
  await fs.writeFile(requestJsonPath, JSON.stringify(request, null, 2), "utf8");

  logs.push({
    timestamp: new Date().toISOString(),
    level: "info",
    message: `[FixtureMode] Fixture generation completed with content fingerprint: ${contentFingerprint}`,
    stream: "system",
    context: { ...logContext, step: "import" },
  });

  return {
    atlasPath,
    manifestPath,
    qaReportPath,
    requestJsonPath,
    logs,
  };
}
