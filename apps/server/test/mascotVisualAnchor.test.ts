import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { RepositoryService } from "../src/repository.js";
import {
  loadChannelMascotVisualAnchor,
  type MascotVisualAnchor,
} from "../src/quiz/thumbnail/thumbnailLoaders.js";
import {
  loadChannelMascotVisualAnchor as loadFromIndex,
  type MascotVisualAnchor as AnchorFromIndex,
} from "../src/quiz/thumbnail/index.js";
import {
  loadChannelMascotVisualAnchor as loadFromService,
  type MascotVisualAnchor as AnchorFromService,
} from "../src/quiz/thumbnail/thumbnailService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Mascot Visual Anchor Data Contract (Stage 1)", () => {
  let tempDir: string;
  let repository: RepositoryService;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `studio-anchor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const projectRoot = path.resolve(__dirname, "../../..");
    repository = new RepositoryService(projectRoot, tempDir);
    await repository.ensureBootstrap();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("exports loadChannelMascotVisualAnchor and MascotVisualAnchor from all relevant index files", () => {
    expect(typeof loadChannelMascotVisualAnchor).toBe("function");
    expect(typeof loadFromIndex).toBe("function");
    expect(typeof loadFromService).toBe("function");
    expect(loadChannelMascotVisualAnchor).toBe(loadFromIndex);
    expect(loadChannelMascotVisualAnchor).toBe(loadFromService);
  });

  it("returns null safely when mascotId is undefined or null", async () => {
    const anchorNull = await loadChannelMascotVisualAnchor(repository, "ch_test", "ep_test", null);
    expect(anchorNull).toBeNull();

    const anchorUndefined = await loadChannelMascotVisualAnchor(repository, "ch_test", "ep_test", undefined);
    expect(anchorUndefined).toBeNull();
  });

  it("returns null safely without throwing when mascotId is not found", async () => {
    const anchorNotFound = await loadChannelMascotVisualAnchor(
      repository,
      "ch_test",
      "ep_test",
      "non_existent_mascot_123",
    );
    expect(anchorNotFound).toBeNull();
  });

  it("returns null safely when mascot has no master image URLs configured", async () => {
    const mascot = await repository.saveMascot({
      name: "PixelCat",
      description: "A cute feline",
      visual_style: "pixar_3d",
      master_prompt: "a cat in cute armor",
      color_theme: "#ffaa00",
    });

    const anchor = await loadChannelMascotVisualAnchor(repository, "ch_test", "ep_test", mascot.id);
    expect(anchor).toBeNull();
  });

  it("loads a valid MascotVisualAnchor with correct mimeType, base64, sourceUrl and sha256 fingerprint", async () => {
    const mascot = await repository.saveMascot({
      name: "RoboPuppy",
      description: "A robotic dog mascot",
      visual_style: "pixar_3d",
      master_prompt: "a shiny robotic puppy",
      color_theme: "#3b82f6",
    });

    // Create a 10x10 green PNG image
    const samplePngBuffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 0, g: 255, b: 128, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const assetUrl = await repository.saveMascotAsset(mascot.id, "master_concept.png", samplePngBuffer);
    await repository.saveMascot({
      ...mascot,
      master_image_url: assetUrl,
    });

    const anchor = await loadChannelMascotVisualAnchor(repository, "ch_1", "ep_1", mascot.id);

    expect(anchor).not.toBeNull();
    if (!anchor) throw new Error("Expected anchor to be defined");

    expect(anchor.mimeType).toBe("image/png");
    expect(anchor.sourceUrl).toBe(assetUrl);
    expect(anchor.base64).toMatch(/^data:image\/png;base64,/);

    // Compute expected sha256 from the decoded base64 payload
    const base64Data = anchor.base64.split(",")[1];
    const decodedBuffer = Buffer.from(base64Data, "base64");
    const expectedFingerprint = createHash("sha256").update(decodedBuffer).digest("hex");

    expect(anchor.fingerprint).toBe(expectedFingerprint);
    expect(anchor.fingerprint.length).toBe(64);
  });

  it("falls back to master_raw_image_url when master_image_url is absent", async () => {
    const mascot = await repository.saveMascot({
      name: "CyberOwl",
      description: "An owl mascot with raw concept",
      visual_style: "pixar_3d",
      master_prompt: "cyber owl",
      color_theme: "#9333ea",
    });

    const rawPngBuffer = await sharp({
      create: {
        width: 12,
        height: 12,
        channels: 4,
        background: { r: 120, g: 60, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const rawAssetUrl = await repository.saveMascotAsset(mascot.id, "master_raw.png", rawPngBuffer);
    await repository.saveMascot({
      ...mascot,
      master_raw_image_url: rawAssetUrl,
    });

    const anchor = await loadChannelMascotVisualAnchor(repository, "ch_2", "ep_2", mascot.id);

    expect(anchor).not.toBeNull();
    if (!anchor) throw new Error("Expected anchor to be defined");

    expect(anchor.sourceUrl).toBe(rawAssetUrl);
    expect(anchor.mimeType).toBe("image/png");
    expect(anchor.base64).toMatch(/^data:image\/png;base64,/);
    expect(anchor.fingerprint).toHaveLength(64);
  });
});
