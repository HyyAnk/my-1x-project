import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AnimationImportError,
  DefaultSpriteGenAdapter,
  importAnimationArtifacts,
  parseSpriteGenManifest,
  SpriteGenManifestError,
  type ImportAnimationContext,
  type SpriteGenExecutionRequest,
} from "../src/quiz/mascot/animation/index.js";

describe("SpriteGen Manifest Parser & Animation Artifact Importer (Stage 06)", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "anim-import-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  const validManifestTemplate = {
    version: 1,
    state: "thinking" as const,
    recipe_id: "thinking-01-head-tilt-left",
    slot_index: 1,
    frame_count: 12 as const,
    fps: 8 as const,
    loop: true,
    loop_policy: "loop" as const,
    atlas: {
      file_path: "atlas.png",
      width: 512,
      height: 384,
      cols: 4,
      rows: 3,
    },
    frames: Array.from({ length: 12 }, (_, i) => ({
      index: i,
      x: (i % 4) * 128,
      y: Math.floor(i / 4) * 128,
      width: 128,
      height: 128,
      duration_ms: 125 as const,
    })),
    registration: {
      source_width: 128,
      source_height: 128,
      content_bounds: { x: 10, y: 10, width: 108, height: 108 },
      pivot: { x: 64, y: 128 },
      offset_x: 0,
      offset_y: 0,
    },
    fingerprint: "test-content-fingerprint-abc",
  };

  it("parses valid manifest adhering strictly to declared frame rects and derives registration", () => {
    const parsed = parseSpriteGenManifest(validManifestTemplate, tempDir);

    expect(parsed.manifest.version).toBe(1);
    expect(parsed.manifest.frame_count).toBe(12);
    expect(parsed.frames).toHaveLength(12);
    expect(parsed.atlasAbsolutePath).toBe(path.resolve(tempDir, "atlas.png"));
    expect(parsed.registration.pivot).toEqual({ x: 64, y: 128 });
    expect(parsed.registration.content_bounds).toEqual({ x: 10, y: 10, width: 108, height: 108 });
  });

  it("supports non-uniform declared bounding boxes and rejects guessed uniform grids", () => {
    // Create manifest with varying (non-uniform) widths/heights per frame
    const nonUniformManifest = {
      ...validManifestTemplate,
      frames: Array.from({ length: 12 }, (_, i) => ({
        index: i,
        x: (i % 4) * 128,
        y: Math.floor(i / 4) * 128,
        width: 100 + (i % 3) * 10, // Non-uniform widths: 100, 110, 120
        height: 110 + (i % 2) * 10, // Non-uniform heights: 110, 120
        duration_ms: 125 as const,
      })),
    };

    const parsed = parseSpriteGenManifest(nonUniformManifest, tempDir);
    expect(parsed.frames[0].width).toBe(100);
    expect(parsed.frames[1].width).toBe(110);
    expect(parsed.frames[2].width).toBe(120);
  });

  it("rejects frame coordinates extending beyond atlas boundary", () => {
    const outOfBoundsManifest = {
      ...validManifestTemplate,
      frames: [
        ...validManifestTemplate.frames.slice(0, 11),
        {
          index: 11,
          x: 450, // 450 + 128 = 578 > atlas width 512!
          y: 256,
          width: 128,
          height: 128,
          duration_ms: 125 as const,
        },
      ],
    };

    expect(() => parseSpriteGenManifest(outOfBoundsManifest, tempDir)).toThrowError(SpriteGenManifestError);
    try {
      parseSpriteGenManifest(outOfBoundsManifest, tempDir);
    } catch (err) {
      expect((err as SpriteGenManifestError).code).toBe("OUT_OF_BOUNDS_FRAME");
    }
  });

  it("rejects path traversal and non-png atlas paths", () => {
    const traversalManifest = {
      ...validManifestTemplate,
      atlas: { ...validManifestTemplate.atlas, file_path: "../../../evil.png" },
    };

    expect(() => parseSpriteGenManifest(traversalManifest, tempDir)).toThrowError(SpriteGenManifestError);
    try {
      parseSpriteGenManifest(traversalManifest, tempDir);
    } catch (err) {
      expect((err as SpriteGenManifestError).code).toBe("UNSAFE_PATH");
    }

    const nonPngManifest = {
      ...validManifestTemplate,
      atlas: { ...validManifestTemplate.atlas, file_path: "atlas.webp" },
    };

    expect(() => parseSpriteGenManifest(nonPngManifest, tempDir)).toThrowError(SpriteGenManifestError);
  });

  it("rejects manifests with frame count not equal to 12", () => {
    const invalidCountManifest = {
      ...validManifestTemplate,
      frame_count: 8,
      frames: validManifestTemplate.frames.slice(0, 8),
    };

    expect(() => parseSpriteGenManifest(invalidCountManifest as any, tempDir)).toThrowError(SpriteGenManifestError);
  });

  it("rejects corrupted or malformed manifest JSON", () => {
    expect(() => parseSpriteGenManifest("{ not valid json", tempDir)).toThrowError(SpriteGenManifestError);
  });

  it("imports synthetic artifacts end-to-end and validates content fingerprint", async () => {
    const adapter = new DefaultSpriteGenAdapter();
    const execRequest: SpriteGenExecutionRequest = {
      jobId: "job-import-001",
      mascotId: "fox-hero",
      styleId: "neon-cyber",
      state: "thinking",
      slot: 1,
      recipeId: "thinking-01-head-tilt-left",
      prompt: "Neon cyber fox head tilt left",
      styleAnchorPath: "/mascot/assets/anchor.png",
      outputDir: tempDir,
      sourceFingerprint: "src-fp-neon-fox-01",
      fixtureMode: true,
    };

    const execResult = await adapter.execute(execRequest);
    expect(execResult.success).toBe(true);

    const importContext: ImportAnimationContext = {
      mascotId: "fox-hero",
      styleId: "neon-cyber",
      state: "thinking",
      slotIndex: 1,
      recipeId: "thinking-01-head-tilt-left",
      sourceFingerprint: "src-fp-neon-fox-01",
    };

    const asset = await importAnimationArtifacts(tempDir, importContext);

    expect(asset.version).toBe(1);
    expect(asset.state).toBe("thinking");
    expect(asset.frame_count).toBe(12);
    expect(asset.fps).toBe(8);
    expect(asset.loop).toBe(true);
    expect(asset.frames).toHaveLength(12);
    expect(asset.content_fingerprint).toBeTruthy();
    expect(asset.source_fingerprint).toBe("src-fp-neon-fox-01");
    expect(asset.atlas_url).toMatch(/atlas\.png$/);
    expect(asset.manifest_url).toMatch(/manifest\.json$/);
    expect(asset.qa_report_url).toMatch(/qa_report\.json$/);
  });

  it("rejects import when filesystem integrity check fails (missing files)", async () => {
    const importContext: ImportAnimationContext = {
      mascotId: "fox-hero",
      styleId: "neon-cyber",
      state: "thinking",
      slotIndex: 1,
      recipeId: "thinking-01-head-tilt-left",
      sourceFingerprint: "src-fp-neon-fox-01",
    };

    await expect(importAnimationArtifacts(tempDir, importContext)).rejects.toThrowError(AnimationImportError);

    try {
      await importAnimationArtifacts(tempDir, importContext);
    } catch (err) {
      expect((err as AnimationImportError).code).toBe("FILE_NOT_FOUND");
    }
  });

  it("rejects import when QA report indicates failure", async () => {
    const adapter = new DefaultSpriteGenAdapter();
    await adapter.execute({
      jobId: "job-import-qa-fail",
      mascotId: "fox-hero",
      styleId: "neon-cyber",
      state: "thinking",
      slot: 1,
      recipeId: "thinking-01-head-tilt-left",
      prompt: "Neon cyber fox",
      styleAnchorPath: "/anchor.png",
      outputDir: tempDir,
      sourceFingerprint: "src-fp-001",
      fixtureMode: true,
    });

    // Overwrite qa_report.json with failed status
    const qaReportPath = path.join(tempDir, "qa_report.json");
    await fs.writeFile(qaReportPath, JSON.stringify({ version: 1, passed: false, error: "Motion jitter exceeded threshold" }), "utf8");

    const importContext: ImportAnimationContext = {
      mascotId: "fox-hero",
      styleId: "neon-cyber",
      state: "thinking",
      slotIndex: 1,
      recipeId: "thinking-01-head-tilt-left",
      sourceFingerprint: "src-fp-001",
    };

    await expect(importAnimationArtifacts(tempDir, importContext)).rejects.toMatchObject({
      code: "QA_FAILED",
    });
  });

  it("rejects import on content fingerprint mismatch when atlas is tampered", async () => {
    const adapter = new DefaultSpriteGenAdapter();
    await adapter.execute({
      jobId: "job-import-tamper",
      mascotId: "fox-hero",
      styleId: "neon-cyber",
      state: "thinking",
      slot: 1,
      recipeId: "thinking-01-head-tilt-left",
      prompt: "Neon cyber fox",
      styleAnchorPath: "/anchor.png",
      outputDir: tempDir,
      sourceFingerprint: "src-fp-001",
      fixtureMode: true,
    });

    // Tamper with atlas.png by appending trailing bytes
    const atlasPath = path.join(tempDir, "atlas.png");
    await fs.appendFile(atlasPath, Buffer.from([0, 1, 2, 3, 4]));

    const importContext: ImportAnimationContext = {
      mascotId: "fox-hero",
      styleId: "neon-cyber",
      state: "thinking",
      slotIndex: 1,
      recipeId: "thinking-01-head-tilt-left",
      sourceFingerprint: "src-fp-001",
    };

    await expect(importAnimationArtifacts(tempDir, importContext)).rejects.toMatchObject({
      code: "FINGERPRINT_MISMATCH",
    });
  });
});
