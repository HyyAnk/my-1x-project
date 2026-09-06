import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { generateMascotStyleBatch, generateMascotStyleSlot } from "../src/quiz/mascot/artGenerator.js";
import { validateMascotPromptContract } from "../src/quiz/mascotPromptContract.js";
import type { AppConfig, MascotProfile, MascotStyle } from "@studio/shared";

const testImageConfig: AppConfig["image_generation"] = {
  enabled: false,
  provider: "shopaikey",
  model: "gpt-image-2",
  api_key: "",
};

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Mascot Style Slot Generation Pipeline", () => {
  it("generates a single style slot with reference image continuity, costume keyword, and studio isolation tags", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-gen-"));
    roots.push(root);
    const app = await buildApp(root);

    // 1. Create mascot
    const mascot = await app.repository.saveMascot({
      name: "Captain Cyber",
      description: "A futuristic robotic fox companion",
      visual_style: "pixar_3d",
      master_prompt: "Futuristic chrome cyber fox with glowing blue optics",
      color_theme: "#06b6d4",
    });

    // 2. Create master concept art asset directly in repository
    const masterFilename = "master_concept_1.png";
    const dummyImageBytes = Buffer.from("<svg>dummy master</svg>", "utf8");
    const masterUrl = await app.repository.saveMascotAsset(mascot.id, masterFilename, dummyImageBytes);
    const mascotWithMaster = await app.repository.saveMascot({
      ...mascot,
      master_image_url: masterUrl,
    });

    // 3. Create a themed style
    const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascotWithMaster.id, {
      name: "Cyber Ninja",
      keyword: "stealth cyber armor katana holographic visor",
    });

    // 4. Generate slot 2 for thinking state
    const result = await generateMascotStyleSlot(
      app.repository,
      mascotWithStyle,
      style.id,
      {
        style_id: style.id,
        state: "thinking",
        slot_index: 2,
        prompt_modifier: "pondering over encrypted datapad",
      },
      testImageConfig,
    );

    // Validate prompt compiler output
    expect(result.prompt_used).toContain("@1");
    expect(result.prompt_used).toContain('Strictly preserve character identity from @1 for "Captain Cyber"');
    expect(result.prompt_used).toContain(
      "Theme & Costume: Styled in authentic stealth cyber armor katana holographic visor attire and accessories.",
    );
    expect(result.prompt_used).toContain("Pose and Action: pondering over encrypted datapad.");
    expect(result.prompt_used).toContain("floating character");
    expect(result.prompt_used).toContain("no ground shadow");
    expect(result.prompt_used).toContain("solid neutral light gray background (#E8E8E8)");
    expect(validateMascotPromptContract(result.prompt_used, true)).toBe(true);

    // Validate slot
    expect(result.slot.slot_index).toBe(2);
    expect(result.slot.image_url).toMatch(/^\/api\/mascots\/[^/]+\/assets\/style_/);
    expect(result.slot.prompt_modifier).toBe("pondering over encrypted datapad");

    // Validate mascot record
    const updatedStyle = result.mascot.styles?.find((s) => s.id === style.id);
    const slotInMascot = updatedStyle?.states.thinking.find((s) => s.slot_index === 2);
    expect(slotInMascot?.image_url).toBe(result.slot.image_url);

    // Verify slot 1 remained empty
    const untouchedSlot = updatedStyle?.states.thinking.find((s) => s.slot_index === 1);
    expect(untouchedSlot?.image_url).toBe("");

    // Verify persisted asset file on disk
    const filename = result.slot.image_url.split("/").pop()!;
    const fileInfo = await app.repository.getMascotAssetFile(mascot.id, filename);
    expect(fileInfo.size).toBeGreaterThan(0);
  });

  it("throws an error when styleId is not found", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-gen-"));
    roots.push(root);
    const app = await buildApp(root);

    const mascot = await app.repository.saveMascot({
      name: "Pip",
      description: "A penguin",
    });

    await expect(
      generateMascotStyleSlot(
        app.repository,
        mascot,
        "non_existent_style",
        {
          style_id: "non_existent_style",
          state: "thinking",
          slot_index: 1,
        },
        testImageConfig,
      ),
    ).rejects.toThrow("Style non_existent_style not found");
  });

  it("batch generates only empty slots for requested state or all states", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-gen-"));
    roots.push(root);
    const app = await buildApp(root);

    const mascot = await app.repository.saveMascot({
      name: "Barnaby Bear",
      description: "A friendly grizzly bear",
    });

    const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascot.id, {
      name: "Space Explorer",
      keyword: "astronaut helmet space suit jetpack",
    });

    // Pre-fill thinking slots 1 and 2
    let updatedMascot = await app.repository.updateMascotSlot(mascotWithStyle.id, {
      style_id: style.id,
      state: "thinking",
      slot_index: 1,
      image_url: "/api/mascots/assets/existing_think_1.png",
    });
    updatedMascot = await app.repository.updateMascotSlot(updatedMascot.id, {
      style_id: style.id,
      state: "thinking",
      slot_index: 2,
      image_url: "/api/mascots/assets/existing_think_2.png",
    });

    // Pre-fill celebrate slot 1
    updatedMascot = await app.repository.updateMascotSlot(updatedMascot.id, {
      style_id: style.id,
      state: "celebrate",
      slot_index: 1,
      image_url: "/api/mascots/assets/existing_celeb_1.png",
    });

    // 1. Batch generate only "thinking" state (should generate 8 slots: 3..10)
    const thinkingBatch = await generateMascotStyleBatch(
      app.repository,
      updatedMascot,
      style.id,
      {
        style_id: style.id,
        state: "thinking",
      },
      testImageConfig,
    );

    expect(thinkingBatch.generated_count).toBe(8);
    const styleAfterThinking = thinkingBatch.mascot.styles?.find((s) => s.id === style.id);
    expect(styleAfterThinking?.states.thinking[0]?.image_url).toBe("/api/mascots/assets/existing_think_1.png");
    expect(styleAfterThinking?.states.thinking[1]?.image_url).toBe("/api/mascots/assets/existing_think_2.png");
    for (let i = 3; i <= 10; i++) {
      expect(styleAfterThinking?.states.thinking[i - 1]?.image_url).toMatch(/^\/api\/mascots\/[^/]+\/assets\/style_/);
    }
    // Celebrate slots 2..10 must still be empty
    expect(styleAfterThinking?.states.celebrate[1]?.image_url).toBe("");

    // 2. Running batch again on "thinking" should generate 0 slots
    const secondThinkingBatch = await generateMascotStyleBatch(
      app.repository,
      thinkingBatch.mascot,
      style.id,
      {
        style_id: style.id,
        state: "thinking",
      },
      testImageConfig,
    );
    expect(secondThinkingBatch.generated_count).toBe(0);

    // 3. Batch generate "all" states (should only generate celebrate slots 2..10 = 9 slots)
    const allBatch = await generateMascotStyleBatch(
      app.repository,
      thinkingBatch.mascot,
      style.id,
      {
        style_id: style.id,
        state: "all",
      },
      testImageConfig,
    );
    expect(allBatch.generated_count).toBe(9);

    const styleAfterAll = allBatch.mascot.styles?.find((s) => s.id === style.id);
    expect(styleAfterAll?.states.celebrate[0]?.image_url).toBe("/api/mascots/assets/existing_celeb_1.png");
    for (let i = 1; i <= 10; i++) {
      expect(styleAfterAll?.states.thinking[i - 1]?.image_url).toBeTruthy();
      expect(styleAfterAll?.states.celebrate[i - 1]?.image_url).toBeTruthy();
    }
  });

  it("handles slot and batch generation over HTTP routes via Fastify inject", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-http-"));
    roots.push(root);
    const app = await buildApp(root);

    // 1. Create mascot
    const createRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots",
      payload: {
        name: "Penny Penguin",
        description: "An adventurous penguin",
        visual_style: "flat_vector",
      },
    });
    expect(createRes.statusCode).toBe(201);
    const mascot = createRes.json<{ mascot: MascotProfile }>().mascot;

    // 2. Create style
    const styleRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles`,
      payload: {
        name: "Winter Explorer",
        keyword: "parka scarf snow goggles",
      },
    });
    expect(styleRes.statusCode).toBe(201);
    const { style } = styleRes.json<{ mascot: MascotProfile; style: MascotStyle }>();

    // 3. POST /api/mascots/:mascotId/styles/:styleId/generate-slot
    const generateSlotRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${style.id}/generate-slot`,
      payload: {
        state: "celebrate",
        slot_index: 1,
        prompt_modifier: "jumping with joyous celebration",
      },
    });
    expect(generateSlotRes.statusCode).toBe(200);
    const slotBody = generateSlotRes.json<{
      mascot: MascotProfile;
      slot: { slot_index: number; image_url: string; prompt_modifier?: string };
      prompt_used: string;
    }>();

    expect(slotBody.slot.slot_index).toBe(1);
    expect(slotBody.slot.image_url).toMatch(/^\/api\/mascots\/[^/]+\/assets\/style_/);
    expect(slotBody.slot.prompt_modifier).toBe("jumping with joyous celebration");
    expect(slotBody.prompt_used).toContain("parka scarf snow goggles");
    expect(slotBody.prompt_used).toContain("jumping with joyous celebration");

    // 4. POST /api/mascots/:mascotId/styles/:styleId/generate-batch
    const generateBatchRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${style.id}/generate-batch`,
      payload: {
        state: "celebrate",
      },
    });
    expect(generateBatchRes.statusCode).toBe(200);
    const batchBody = generateBatchRes.json<{
      mascot: MascotProfile;
      generated_count: number;
    }>();

    // Since slot 1 was already generated, slots 2..10 = 9 slots are generated
    expect(batchBody.generated_count).toBe(9);
    const celebrateSlots = batchBody.mascot.styles?.find((s) => s.id === style.id)?.states.celebrate;
    expect(celebrateSlots?.length).toBe(10);
    for (const slot of celebrateSlots || []) {
      expect(slot.image_url).toBeTruthy();
    }
  });
});
