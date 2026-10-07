import { describe, expect, it } from "vitest";
import { writeFile, readFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { QuizAssetRequirement } from "@studio/shared";
import {
  encodeRgbaToPng,
  decodePngToRgba,
  hasNativeTransparency,
} from "../src/utils/imageMatting.js";
import { validateAndEnrichAsset } from "../src/quiz/assets/resolvers/assetEnricher.js";
import { getOptimalAssetDimensions } from "../src/tasks/video/imageOptimizer.js";
import type { ProviderAssetInput, ProviderAssetOutput } from "../src/quiz/assets/resolvers/types/providerAsset.types.js";

function createSolidChromaImage(width = 64, height = 64): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    // Pure green chroma background (fully opaque)
    data[i] = 0;
    data[i + 1] = 255;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }
  // Centered red subject
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  for (let y = cy - 10; y < cy + 10; y++) {
    for (let x = cx - 10; x < cx + 10; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }
  }
  return encodeRgbaToPng({ width, height, data });
}

function createTransparentImage(width = 64, height = 64): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  // Alpha = 0 by default (transparent background)
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  for (let y = cy - 10; y < cy + 10; y++) {
    for (let x = cx - 10; x < cx + 10; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 215;
      data[idx + 2] = 0;
      data[idx + 3] = 255; // Gold subject
    }
  }
  return encodeRgbaToPng({ width, height, data });
}

describe("Quiz Asset Auto-Matting Pipeline (Phase 4)", () => {
  it("provides optimal dimensions for bridge_topic_item in getOptimalAssetDimensions", () => {
    const dims = getOptimalAssetDimensions("bridge_topic_item");
    expect(dims.maxWidth).toBe(640);
    expect(dims.maxHeight).toBe(640);
    expect(dims.aspectRatio).toBe("1:1");
  });

  it("detects opaque image for transparent asset requirement and triggers auto-matting", async () => {
    const tmpDir = path.join(os.tmpdir(), "studio-test-matting-" + Date.now());
    await mkdir(tmpDir, { recursive: true });

    try {
      const testFilePath = path.join(tmpDir, "sticker.png");
      const solidBytes = createSolidChromaImage(64, 64);
      await writeFile(testFilePath, solidBytes);

      // Verify source image is genuinely opaque
      const preDecoded = decodePngToRgba(solidBytes);
      expect(hasNativeTransparency(preDecoded)).toBe(false);

      const request: QuizAssetRequirement = {
        asset_id: "asset-bridge-item-1",
        question_id: null,
        subject: "Golden cross emblem",
        purpose: "bridge_topic_item",
        style: "cute_illustration",
        aspect_ratio: "1:1",
        transparent_background: true,
        required: false,
        semantic_key: "bridge:showcase:1",
      };

      const mockRepository = {
        resolveQuizAssetPath: async () => testFilePath,
      } as any;

      const input: ProviderAssetInput = {
        repository: mockRepository,
        channelId: "ch_test",
        episodeId: "ep_test",
        request,
        fingerprint: "fp123",
        compiledPrompt: "test prompt",
        configuredProvider: "gpti2",
        activeEngine: "codex",
        logger: {
          info: () => {},
          warn: () => {},
        } as any,
      };

      const rawResult: ProviderAssetOutput = {
        entry: {
          asset_id: request.asset_id,
          path: "sticker.png",
          fingerprint: "fp123",
          source: "generated",
          provider: "gpti2",
          model: "test-model",
          generated_at: new Date().toISOString(),
          transparent_background: true,
        },
      };

      const enriched = await validateAndEnrichAsset(input, rawResult);
      expect(enriched.entry.asset_id).toBe("asset-bridge-item-1");

      // Verify that the file on disk was replaced with a genuinely transparent PNG
      const mattedBytes = new Uint8Array(await readFile(testFilePath));
      const postDecoded = decodePngToRgba(mattedBytes);
      expect(hasNativeTransparency(postDecoded)).toBe(true);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("bypasses matting when image already has native transparency", async () => {
    const tmpDir = path.join(os.tmpdir(), "studio-test-transparent-" + Date.now());
    await mkdir(tmpDir, { recursive: true });

    try {
      const testFilePath = path.join(tmpDir, "already_transparent.png");
      const initialTransparentBytes = createTransparentImage(64, 64);
      await writeFile(testFilePath, initialTransparentBytes);

      const request: QuizAssetRequirement = {
        asset_id: "asset-bridge-item-4",
        question_id: null,
        subject: "Avatar sticker",
        purpose: "bridge_topic_item",
        style: "cute_illustration",
        aspect_ratio: "1:1",
        transparent_background: true,
        required: false,
        semantic_key: "bridge:showcase:4",
      };

      const mockRepository = {
        resolveQuizAssetPath: async () => testFilePath,
      } as any;

      const input: ProviderAssetInput = {
        repository: mockRepository,
        channelId: "ch_test",
        episodeId: "ep_test",
        request,
        fingerprint: "fp456",
        compiledPrompt: "test prompt",
        configuredProvider: "gpti2",
        activeEngine: "codex",
      };

      const rawResult: ProviderAssetOutput = {
        entry: {
          asset_id: request.asset_id,
          path: "already_transparent.png",
          fingerprint: "fp456",
          source: "generated",
          provider: "gpti2",
          model: "test-model",
          generated_at: new Date().toISOString(),
          transparent_background: true,
        },
      };

      await validateAndEnrichAsset(input, rawResult);

      const readBackBytes = new Uint8Array(await readFile(testFilePath));
      expect(readBackBytes).toEqual(initialTransparentBytes);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
