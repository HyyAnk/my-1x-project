import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, MascotProfile } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { generateMascotStyleConcept, generateMascotStyleSlot } from "../src/quiz/mascot/artGenerator.js";
import { generateMascotArtWithFallback } from "../src/quiz/mascot/services/mascotAiImageClient.js";
import {
  assertGreenScreenCandidate,
  reinforcePromptWithGreenScreen,
  validateGeneratedGreenScreen,
} from "../src/quiz/mascot/services/mascotGreenScreenIngressGuard.js";
import { MASCOT_GREEN_SCREEN_REINFORCEMENT_TAGS } from "../src/quiz/mascotPromptConstants.js";
import { encodeRgbaToPng, validateGreenScreen, type DecodedImage } from "../src/utils/imageMatting.js";
import * as shopAiKeyModule from "../src/providers/shopAiKeyImage.js";

type Rgba = [number, number, number, number];

function createPngWithFill(
  width: number,
  height: number,
  bgColor: Rgba,
  subjectRect?: { x: number; y: number; w: number; h: number; color: Rgba },
): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4 + 0] = bgColor[0];
    data[i * 4 + 1] = bgColor[1];
    data[i * 4 + 2] = bgColor[2];
    data[i * 4 + 3] = bgColor[3];
  }

  if (subjectRect) {
    for (let y = subjectRect.y; y < subjectRect.y + subjectRect.h; y++) {
      for (let x = subjectRect.x; x < subjectRect.x + subjectRect.w; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          data[idx + 0] = subjectRect.color[0];
          data[idx + 1] = subjectRect.color[1];
          data[idx + 2] = subjectRect.color[2];
          data[idx + 3] = subjectRect.color[3];
        }
      }
    }
  }

  return encodeRgbaToPng({ width, height, data });
}

function createValid1x1GreenScreenPng(): Uint8Array {
  // 64x64, pure green background (#00FF00), centered subject with blue clothes/body
  return createPngWithFill(64, 64, [0, 255, 0, 255], {
    x: 20,
    y: 20,
    w: 24,
    h: 24,
    color: [30, 80, 220, 255],
  });
}

function createValid16x9GreenScreenPng(): Uint8Array {
  // 160x90 (16:9), pure green background (#00FF00), centered half-body subject in lower middle
  return createPngWithFill(160, 90, [0, 255, 0, 255], {
    x: 60,
    y: 35,
    w: 40,
    h: 55,
    color: [220, 100, 30, 255],
  });
}

function createTransparentPng(): Uint8Array {
  // 64x64 with transparent border/background (pre-matted by provider)
  return createPngWithFill(64, 64, [0, 0, 0, 0], {
    x: 20,
    y: 20,
    w: 24,
    h: 24,
    color: [30, 80, 220, 255],
  });
}

function createWhiteBackgroundPng(): Uint8Array {
  // 64x64 with solid white background (#FFFFFF)
  return createPngWithFill(64, 64, [255, 255, 255, 255], {
    x: 20,
    y: 20,
    w: 24,
    h: 24,
    color: [30, 80, 220, 255],
  });
}

const mockAiConfig: AppConfig["image_generation"] = {
  enabled: true,
  provider: "shopaikey",
  model: "gpt-image-2",
  api_key: "test-shopaikey-key",
  base_url: "https://direct.shopaikey.com/v1",
};

const roots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

describe("Stage 2: Mascot Chroma-Key Green Ingress Guard & Auto-Retry", () => {
  describe("Prompt Reinforcement Helper", () => {
    it("appends green-screen reinforcement tags to prompt", () => {
      const original = "Cute fox mascot, floating character, no ground shadow";
      const reinforced = reinforcePromptWithGreenScreen(original);
      expect(reinforced).toContain(original);
      expect(reinforced).toContain(MASCOT_GREEN_SCREEN_REINFORCEMENT_TAGS);
    });

    it("avoids duplicate reinforcement tags when already present", () => {
      const alreadyReinforced = `Fox mascot, ${MASCOT_GREEN_SCREEN_REINFORCEMENT_TAGS}`;
      const result = reinforcePromptWithGreenScreen(alreadyReinforced);
      expect(result).toBe(alreadyReinforced);
    });
  });

  describe("Validation Guard Core", () => {
    it("accepts authentic 1:1 and 16:9 green-screen candidate buffers", async () => {
      const green1x1 = createValid1x1GreenScreenPng();
      const res1x1 = await validateGeneratedGreenScreen(green1x1, "1:1");
      expect(res1x1.isValid).toBe(true);
      expect(res1x1.greenRatio).toBeGreaterThanOrEqual(0.65);
      expect(res1x1.isTransparent).toBe(false);

      const green16x9 = createValid16x9GreenScreenPng();
      const res16x9 = await validateGeneratedGreenScreen(green16x9, "16:9");
      expect(res16x9.isValid).toBe(true);
      expect(res16x9.greenRatio).toBeGreaterThanOrEqual(0.65);
      expect(res16x9.isTransparent).toBe(false);
    });

    it("rejects transparent candidates with native_transparency", async () => {
      const transparentImg = createTransparentPng();
      const res = await validateGeneratedGreenScreen(transparentImg);
      expect(res.isValid).toBe(false);
      expect(res.reason).toBe("native_transparency");
      expect(res.isTransparent).toBe(true);
    });

    it("rejects white background candidates with insufficient_green_chroma", async () => {
      const whiteImg = createWhiteBackgroundPng();
      const res = await validateGeneratedGreenScreen(whiteImg);
      expect(res.isValid).toBe(false);
      expect(res.reason).toBe("insufficient_green_chroma");
      expect(res.greenRatio).toBe(0);
    });

    it("throws descriptive error when assertGreenScreenCandidate fails", async () => {
      const whiteImg = createWhiteBackgroundPng();
      await expect(assertGreenScreenCandidate(whiteImg, "1:1", "test slot")).rejects.toThrow(
        "Green-screen validation failed for test slot: reason=insufficient_green_chroma",
      );
    });
  });

  describe("Generator Ingress Guard in generateMascotArtWithFallback", () => {
    it("accepts valid green-screen AI output on first attempt without retries", async () => {
      const validGreen = createValid1x1GreenScreenPng();
      const spy = vi.spyOn(shopAiKeyModule, "generateShopAiKeyImageBytes").mockResolvedValue(validGreen);

      const result = await generateMascotArtWithFallback({
        prompt: "Single centered mascot, floating character, no ground shadow, high contrast studio rim lighting",
        imageConfig: mockAiConfig,
        options: {
          requireGreenScreen: true,
          composition: "1:1",
        },
        fallbackArt: () => new Uint8Array([0]),
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.placeholder).toBe(false);

      // Verify rawBytes is compliant green screen
      const rawValidation = validateGreenScreen(result.rawBytes, { composition: "1:1" });
      expect(rawValidation.isValid).toBe(true);
      expect(rawValidation.isTransparent).toBe(false);

      // Verify mattedBytes has background removed
      const mattedValidation = validateGreenScreen(result.mattedBytes, { composition: "1:1" });
      expect(mattedValidation.isTransparent).toBe(true);
    });

    it("detects pre-matted / transparent output from provider and triggers auto-retry", async () => {
      const transparentImg = createTransparentPng();
      const validGreen = createValid1x1GreenScreenPng();

      const promptsReceived: string[] = [];
      const spy = vi.spyOn(shopAiKeyModule, "generateShopAiKeyImageBytes").mockImplementation(async (prompt) => {
        promptsReceived.push(prompt);
        if (promptsReceived.length === 1) {
          return transparentImg; // Attempt 1 returns pre-matted transparent
        }
        return validGreen; // Attempt 2 returns compliant green screen
      });

      const basePrompt = "Single centered mascot, floating character, no ground shadow, high contrast studio rim lighting";
      const result = await generateMascotArtWithFallback({
        prompt: basePrompt,
        imageConfig: mockAiConfig,
        options: {
          requireGreenScreen: true,
          maxGreenScreenRetries: 2,
          composition: "1:1",
        },
        fallbackArt: () => new Uint8Array([0]),
      });

      // Provider was called twice
      expect(spy).toHaveBeenCalledTimes(2);
      expect(promptsReceived.length).toBe(2);

      // First call had initial prompt
      expect(promptsReceived[0]).toBe(basePrompt);

      // Second call had reinforced prompt
      expect(promptsReceived[1]).toContain(basePrompt);
      expect(promptsReceived[1]).toContain(MASCOT_GREEN_SCREEN_REINFORCEMENT_TAGS);

      // Final result is valid
      expect(result.placeholder).toBe(false);
      const rawValidation = validateGreenScreen(result.rawBytes, { composition: "1:1" });
      expect(rawValidation.isValid).toBe(true);
    });

    it("detects non-green output (white background) and triggers auto-retry with reinforced prompt", async () => {
      const whiteImg = createWhiteBackgroundPng();
      const validGreen = createValid1x1GreenScreenPng();

      const promptsReceived: string[] = [];
      const spy = vi.spyOn(shopAiKeyModule, "generateShopAiKeyImageBytes").mockImplementation(async (prompt) => {
        promptsReceived.push(prompt);
        if (promptsReceived.length === 1) {
          return whiteImg; // Attempt 1 returns non-green
        }
        return validGreen; // Attempt 2 returns valid green
      });

      const basePrompt = "Single centered mascot, floating character, no ground shadow, high contrast studio rim lighting";
      const result = await generateMascotArtWithFallback({
        prompt: basePrompt,
        imageConfig: mockAiConfig,
        options: {
          requireGreenScreen: true,
          maxGreenScreenRetries: 2,
          composition: "1:1",
        },
        fallbackArt: () => new Uint8Array([0]),
      });

      expect(spy).toHaveBeenCalledTimes(2);
      expect(promptsReceived[1]).toContain(MASCOT_GREEN_SCREEN_REINFORCEMENT_TAGS);
      expect(result.placeholder).toBe(false);
    });

    it("successful retry yields valid green raw image and matted transparent image", async () => {
      const whiteImg = createWhiteBackgroundPng();
      const validGreen = createValid1x1GreenScreenPng();

      vi.spyOn(shopAiKeyModule, "generateShopAiKeyImageBytes")
        .mockResolvedValueOnce(whiteImg)
        .mockResolvedValueOnce(validGreen);

      const result = await generateMascotArtWithFallback({
        prompt: "Single centered mascot, floating character, no ground shadow, high contrast studio rim lighting",
        imageConfig: mockAiConfig,
        options: {
          requireGreenScreen: true,
          maxGreenScreenRetries: 1,
        },
        fallbackArt: () => new Uint8Array([0]),
      });

      expect(result.placeholder).toBe(false);

      // Raw image must be green and opaque
      const rawCheck = validateGreenScreen(result.rawBytes);
      expect(rawCheck.isValid).toBe(true);
      expect(rawCheck.greenRatio).toBeGreaterThanOrEqual(0.65);
      expect(rawCheck.isTransparent).toBe(false);

      // Matted image must have alpha transparency
      const mattedCheck = validateGreenScreen(result.mattedBytes);
      expect(mattedCheck.isTransparent).toBe(true);
    });

    it("exceeding max retries throws error rather than saving invalid image", async () => {
      const whiteImg = createWhiteBackgroundPng();
      const spy = vi.spyOn(shopAiKeyModule, "generateShopAiKeyImageBytes").mockResolvedValue(whiteImg);

      await expect(
        generateMascotArtWithFallback({
          prompt: "Single centered mascot, floating character, no ground shadow, high contrast studio rim lighting",
          imageConfig: mockAiConfig,
          options: {
            requireGreenScreen: true,
            maxGreenScreenRetries: 2, // 1 initial + 2 retries = 3 attempts total
          },
          actionLabel: "test mascot art",
          fallbackArt: () => new Uint8Array([0]),
        }),
      ).rejects.toThrow("Green-screen validation failed for test mascot art after 3 attempts (reason: insufficient_green_chroma");

      // Verify provider was called exactly 3 times (1 initial + 2 retries)
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe("Integration: Style Concept Generator with Green Screen Ingress", () => {
    it("saves compliant green screen raw asset when AI generates green screen", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-concept-gs-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Eco Panda",
        visual_style: "pixar_3d",
        color_theme: "#10b981",
      });
      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Bamboo Armor",
        keyword: "bamboo armor helmet",
      });

      const validGreen = createValid1x1GreenScreenPng();
      vi.spyOn(shopAiKeyModule, "generateShopAiKeyImageBytes").mockResolvedValue(validGreen);

      const result = await generateMascotStyleConcept(
        app.repository,
        mascot,
        style.id,
        mockAiConfig,
        { prompt: "wear bamboo leaf armor" },
      );

      expect(result.placeholder).toBe(false);
      expect(result.raw_image_url).toBeDefined();

      // Read raw asset saved on disk and verify compliance
      const rawFilename = result.raw_image_url.split("/").pop()!;
      const rawFile = await app.repository.getMascotAssetFile(mascot.id, rawFilename);
      const rawContent = await readFile(rawFile.absolutePath);
      const rawValidation = validateGreenScreen(rawContent, { composition: "1:1" });
      expect(rawValidation.isValid).toBe(true);
      expect(rawValidation.isTransparent).toBe(false);
    });

    it("rejects and rolls back when AI persistently fails green screen validation", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-concept-fail-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Eco Panda",
        visual_style: "pixar_3d",
        color_theme: "#10b981",
      });
      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Bamboo Armor",
        keyword: "bamboo armor helmet",
      });

      // Always returns transparent pre-matted image
      const transparentImg = createTransparentPng();
      vi.spyOn(shopAiKeyModule, "generateShopAiKeyImageBytes").mockResolvedValue(transparentImg);

      await expect(
        generateMascotStyleConcept(app.repository, mascot, style.id, mockAiConfig, { prompt: "wear bamboo leaf armor" }),
      ).rejects.toThrow("Green-screen validation failed");

      // Verify mascot style anchor was not updated with invalid image
      const refreshedMascot = await app.repository.getMascot(mascot.id);
      const refreshedStyle = refreshedMascot.styles?.find((s) => s.id === style.id);
      expect(refreshedStyle?.anchor_image_url).toBeNull();
      expect(refreshedStyle?.raw_anchor_image_url).toBeFalsy();
    });
  });

  describe("Integration: Style Slot Generator with 16:9 Green Screen Ingress", () => {
    it("saves compliant 16:9 green screen raw asset for style slot", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-slot-gs-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Cyber Dino",
        visual_style: "pixar_3d",
        color_theme: "#06b6d4",
      });
      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Neon Tech",
        keyword: "neon visor cyber chestplate",
      });

      const valid16x9Green = createValid16x9GreenScreenPng();
      vi.spyOn(shopAiKeyModule, "generateShopAiKeyImageBytes").mockResolvedValue(valid16x9Green);

      const result = await generateMascotStyleSlot(
        app.repository,
        mascot,
        style.id,
        {
          style_id: style.id,
          state: "thinking",
          slot_index: 1,
        },
        mockAiConfig,
        undefined,
        { composition: "half_body_16_9" },
      );

      expect(result.placeholder).toBe(false);
      expect(result.slot.raw_image_url).toBeDefined();

      const rawFilename = result.slot.raw_image_url!.split("/").pop()!;
      const rawFile = await app.repository.getMascotAssetFile(mascot.id, rawFilename);
      const rawContent = await readFile(rawFile.absolutePath);
      const rawValidation = validateGreenScreen(rawContent, { composition: "16:9" });
      expect(rawValidation.isValid).toBe(true);
      expect(rawValidation.isTransparent).toBe(false);
    });

    it("rejects and prevents saving when 16:9 slot fails green screen validation across retries", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-slot-fail-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Cyber Dino",
        visual_style: "pixar_3d",
        color_theme: "#06b6d4",
      });
      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Neon Tech",
        keyword: "neon visor cyber chestplate",
      });

      const whiteImg = createWhiteBackgroundPng();
      vi.spyOn(shopAiKeyModule, "generateShopAiKeyImageBytes").mockResolvedValue(whiteImg);

      await expect(
        generateMascotStyleSlot(
          app.repository,
          mascot,
          style.id,
          {
            style_id: style.id,
            state: "celebrate",
            slot_index: 2,
          },
          mockAiConfig,
          undefined,
          { composition: "half_body_16_9" },
        ),
      ).rejects.toThrow("Green-screen validation failed");

      // Verify slot was not saved with invalid asset
      const refreshedMascot = await app.repository.getMascot(mascot.id);
      const refreshedStyle = refreshedMascot.styles?.find((s) => s.id === style.id);
      const slot = refreshedStyle?.states.celebrate.find((s) => s.slot_index === 2);
      expect(slot?.raw_image_url).toBeFalsy();
    });
  });
});
