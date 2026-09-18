import { describe, expect, it } from "vitest";
import {
  FRAME_DURATION_MS,
  PINNED_UPSTREAM_REVISION,
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  SUPPORTED_PROVIDER,
  buildSpriteGenArtifactPaths,
  buildSpriteGenCommandShape,
  detectSpriteGenEnvironment,
  runSpriteGenDiagnostic,
  validateSpriteGenCommandShape,
  type SpriteGenCommandConfig,
} from "../src/quiz/mascot/animation/spriteGen/index.js";

describe("SpriteGen Diagnostics & Command Shape (Stage 02)", () => {
  const baseConfig: SpriteGenCommandConfig = {
    styleAnchorPath: "/assets/mascot/style_anchor_01.png",
    recipeId: "thinking-01-head-tilt-left",
    prompt: "Cute robotic mascot tilts head to the left, 12 keyframes, chroma key background",
    frameCount: REQUIRED_FRAME_COUNT,
    fps: REQUIRED_FPS,
    loop: true,
    cellWidth: 512,
    cellHeight: 512,
    margin: 16,
    chromaKey: "#00FF00",
    fit: "contain",
    outputDir: "/artifacts/sprite_gen/test_output",
    provider: SUPPORTED_PROVIDER,
  };

  it("detects the environment and reports Python and provider status", async () => {
    const env = await detectSpriteGenEnvironment();
    expect(env).toBeDefined();
    expect(env.pinnedRevision).toBe(PINNED_UPSTREAM_REVISION);
    expect(env.codexAvailable).toBe(true);
    expect(env.ffmpegFreeVerified).toBe(true);
    expect(Array.isArray(env.notes)).toBe(true);
    expect(env.notes.length).toBeGreaterThan(0);
  });

  it("builds a canonical 12-frame, 8 FPS, ffmpeg-free command shape", () => {
    const shape = buildSpriteGenCommandShape(baseConfig);

    expect(shape.executable).toBe("sprite-gen");
    expect(shape.provider).toBe(SUPPORTED_PROVIDER);
    expect(shape.ffmpegRequired).toBe(false);

    // Verify command-line arguments
    expect(shape.args).toContain("--provider");
    expect(shape.args).toContain("codex");
    expect(shape.args).toContain("--frames");
    expect(shape.args).toContain("12");
    expect(shape.args).toContain("--fps");
    expect(shape.args).toContain("8");
    expect(shape.args).toContain("--ffmpeg-free");
    expect(shape.args).toContain("--loop");

    // Verify request JSON structure
    expect(shape.requestJson.frame_count).toBe(12);
    expect(shape.requestJson.fps).toBe(8);
    expect(shape.requestJson.duration_per_frame_ms).toBe(FRAME_DURATION_MS);
    expect(shape.requestJson.provider).toBe("codex");

    // Validate using validator
    const validation = validateSpriteGenCommandShape(shape);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("generates exact artifact paths with proper extensions", () => {
    const paths = buildSpriteGenArtifactPaths("/test/dir");
    expect(paths.requestJsonPath).toMatch(/request\.json$/);
    expect(paths.atlasPath).toMatch(/atlas\.png$/);
    expect(paths.manifestPath).toMatch(/manifest\.json$/);
    expect(paths.qaReportPath).toMatch(/qa_report\.json$/);
    expect(paths.rawFramesDir).toMatch(/frames_raw$/);
    expect(paths.curatedFramesDir).toMatch(/frames_curated$/);
  });

  it("rejects non-12-frame requests strictly", () => {
    const invalidConfig = { ...baseConfig, frameCount: 16 };
    const shape = buildSpriteGenCommandShape(invalidConfig);
    const validation = validateSpriteGenCommandShape(shape);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((err) => err.includes("expected exactly 12 frames"))).toBe(true);
  });

  it("rejects non-8-FPS timing requests strictly", () => {
    const invalidConfig = { ...baseConfig, fps: 24 };
    const shape = buildSpriteGenCommandShape(invalidConfig);
    const validation = validateSpriteGenCommandShape(shape);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((err) => err.includes("expected exactly 8 FPS"))).toBe(true);
  });

  it("strictly rejects Grok and video-to-loop providers", () => {
    const grokShape = buildSpriteGenCommandShape({ ...baseConfig, provider: "grok" });
    const grokValidation = validateSpriteGenCommandShape(grokShape);
    expect(grokValidation.valid).toBe(false);
    expect(grokValidation.errors.some((err) => err.includes("forbidden"))).toBe(true);

    const videoShape = buildSpriteGenCommandShape({ ...baseConfig, provider: "video_to_loop" });
    const videoValidation = validateSpriteGenCommandShape(videoShape);
    expect(videoValidation.valid).toBe(false);
    expect(videoValidation.errors.some((err) => err.includes("forbidden"))).toBe(true);
  });

  it("rejects configurations requiring ffmpeg", () => {
    const shape = buildSpriteGenCommandShape(baseConfig);
    shape.ffmpegRequired = true;
    const validation = validateSpriteGenCommandShape(shape);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((err) => err.includes("must be ffmpeg-free"))).toBe(true);
  });

  it("rejects malformed artifact paths or invalid extensions", () => {
    const shape = buildSpriteGenCommandShape(baseConfig);
    shape.artifactPaths.atlasPath = "/test/atlas.bmp";
    const validation = validateSpriteGenCommandShape(shape);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((err) => err.includes(".png"))).toBe(true);
  });

  it("executes the end-to-end diagnostic runner and verifies successful report", async () => {
    const report = await runSpriteGenDiagnostic();

    expect(report).toBeDefined();
    expect(report.success).toBe(true);
    expect(report.environment.pinnedRevision).toBe(PINNED_UPSTREAM_REVISION);
    expect(report.environment.codexAvailable).toBe(true);
    expect(report.environment.ffmpegFreeVerified).toBe(true);
    expect(report.commandShape.requestJson.frame_count).toBe(12);
    expect(report.commandShape.requestJson.fps).toBe(8);
    expect(report.validation.valid).toBe(true);
  });
});
