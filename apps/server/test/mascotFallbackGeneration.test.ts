import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { generateMascotStyleSlot } from "../src/quiz/mascot/artGenerator.js";
import * as gpti2Module from "../src/providers/gpti2/generator.js";
import * as imgStudioModule from "../src/providers/imgstudio/generator.js";
import type { AppConfig } from "@studio/shared";

const roots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Mascot Fallback Generation Pipeline", () => {
  it("automatically falls back to ImgStudio when primary provider fails", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-fallback-test-"));
    roots.push(root);
    const app = await buildApp(root);

    const mascot = await app.repository.saveMascot({
      name: "Novy",
      description: "A cute little baby dino",
      visual_style: "pixar_3d",
      master_prompt: "Baby red dinosaur with tiny wings",
      color_theme: "#ff6b4a",
    });

    const masterFilename = "master_concept.png";
    const dummyImageBytes = Buffer.from("<svg>novy master</svg>", "utf8");
    await app.repository.saveMascotAsset(mascot.id, masterFilename, dummyImageBytes);
    const mascotWithMaster = await app.repository.saveMascot({
      ...mascot,
      master_image_url: `/api/mascots/${mascot.id}/assets/${masterFilename}`,
    });

    const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascotWithMaster.id, {
      name: "Core Style",
      keyword: "",
    });

    // Mock primary failure (e.g. timeout or queue cancel)
    const primarySpy = vi.spyOn(gpti2Module, "generateGpti2ImageBytes").mockRejectedValue(new Error("Image generation was cancelled"));

    // Mock fallback success
    const fallbackImageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes
    const fallbackSpy = vi.spyOn(imgStudioModule, "generateImgStudioImageBytes").mockResolvedValue({
      bytes: fallbackImageBytes,
      model: "2d059365-a09a-4fd5-aa9e-b5335d09bbe9",
      aspect_ratio: "16:9",
      resolution: "2K",
      price_vnd: 150,
    });

    const primaryConfig: AppConfig["image_generation"] = {
      enabled: true,
      provider: "gpti2",
      model: "gpt-image-2",
      api_key: "sk-fake-primary-key",
      quality: "low",
      max_concurrent_tasks: 3,
      images_per_bundle: 1,
    };

    const fallbackConfig: AppConfig["image_fallback"] = {
      enabled: true,
      provider: "imgstudio",
      base_url: "https://imgstudio.site",
      model: "2d059365-a09a-4fd5-aa9e-b5335d09bbe9",
      api_key: "img_test_fallback_key",
      resolution: "2K",
      quality: "standard",
    };

    const result = await generateMascotStyleSlot(
      app.repository,
      mascotWithStyle,
      style.id,
      {
        style_id: style.id,
        state: "celebrate",
        slot_index: 2,
        prompt_modifier: "Punching the air excitedly in triumph",
      },
      primaryConfig,
      undefined,
      {
        imageFallbackConfig: fallbackConfig,
      },
    );

    expect(primarySpy).toHaveBeenCalled();
    expect(fallbackSpy).toHaveBeenCalledTimes(1);
    const fallbackCallArgs = fallbackSpy.mock.calls[0];
    expect(fallbackCallArgs[0]).toContain("Pose and Action: Punching the air excitedly in triumph.");
    expect(fallbackCallArgs[1]?.apiKey).toBe("img_test_fallback_key");
    expect(fallbackCallArgs[1]?.aspect_ratio).toBe("16:9");
    expect(fallbackCallArgs[1]?.referenceImage).toBeDefined();

    // Must not be a placeholder since fallback succeeded
    expect(result.placeholder).toBe(false);
    expect(result.slot.image_url).toBeTruthy();
    expect(result.slot.raw_image_url).toBeTruthy();
  });

  it("safely falls back to procedural placeholder if both primary and fallback fail", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-both-fail-"));
    roots.push(root);
    const app = await buildApp(root);

    const mascot = await app.repository.saveMascot({
      name: "Novy",
      visual_style: "pixar_3d",
      color_theme: "#ff6b4a",
    });

    const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascot.id, {
      name: "Core Style",
      keyword: "",
    });

    vi.spyOn(gpti2Module, "generateGpti2ImageBytes").mockRejectedValue(new Error("Primary server offline"));
    vi.spyOn(imgStudioModule, "generateImgStudioImageBytes").mockRejectedValue(new Error("Fallback server offline"));

    const result = await generateMascotStyleSlot(
      app.repository,
      mascotWithStyle,
      style.id,
      {
        style_id: style.id,
        state: "celebrate",
        slot_index: 3,
      },
      {
        enabled: true,
        provider: "gpti2",
        model: "gpt-image-2",
        api_key: "sk-fake",
        quality: "low",
        max_concurrent_tasks: 1,
        images_per_bundle: 1,
      },
      undefined,
      {
        imageFallbackConfig: {
          enabled: true,
          provider: "imgstudio",
          api_key: "img_fake",
          base_url: "https://imgstudio.site",
          model: "default",
          resolution: "2K",
          quality: "standard",
        },
      },
    );

    expect(result.placeholder).toBe(true);
    expect(result.slot.image_url).toBeTruthy();
  });

  it("passes image_fallback from state config through Fastify endpoint", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-endpoint-fallback-"));
    roots.push(root);

    // Set state configurations via image.local.json
    const studioRuntimeDir = path.join(root, ".quiz-studio");
    await mkdir(studioRuntimeDir, { recursive: true });
    await writeFile(
      path.join(studioRuntimeDir, "image.local.json"),
      JSON.stringify({
        image_generation: {
          enabled: true,
          provider: "gpti2",
          model: "gpt-image-2",
          api_key: "sk-primary",
        },
        image_fallback: {
          enabled: true,
          provider: "imgstudio",
          base_url: "https://imgstudio.site",
          model: "default-model",
          api_key: "img_test_key",
          resolution: "2K",
          quality: "standard",
        },
      }),
      "utf8",
    );

    const app = await buildApp(root);

    const mascot = await app.repository.saveMascot({
      name: "Novy",
      visual_style: "pixar_3d",
      color_theme: "#ff6b4a",
    });
    const { style } = await app.repository.createMascotStyle(mascot.id, {
      name: "Core Style",
      keyword: "",
    });

    vi.spyOn(gpti2Module, "generateGpti2ImageBytes").mockRejectedValue(new Error("Timeout"));
    const fallbackSpy = vi.spyOn(imgStudioModule, "generateImgStudioImageBytes").mockResolvedValue({
      bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      model: "default-model",
      aspect_ratio: "16:9",
      resolution: "2K",
      price_vnd: 150,
    });

    const response = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${style.id}/generate-slot`,
      payload: {
        style_id: style.id,
        state: "celebrate",
        slot_index: 2,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.placeholder).toBe(false);
    expect(fallbackSpy).toHaveBeenCalledTimes(1);
    expect(fallbackSpy.mock.calls[0]?.[1]?.apiKey).toBe("img_test_key");
  });
});
