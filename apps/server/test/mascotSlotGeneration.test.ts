import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { generateMascotStyleBatch, generateMascotStyleSlot } from "../src/quiz/mascot/artGenerator.js";
import { validateMascotPromptContract } from "../src/quiz/mascotPromptContract.js";
import { decodePngToRgba, encodeRgbaToPng } from "../src/utils/imageMatting.js";
import { parseStyleSlotTarget, removeMascotAssetBackground } from "../src/quiz/mascot/backgroundRemover.js";
import type { AppConfig, MascotProfile, MascotStyle } from "@studio/shared";
import { getMascotPoses } from "@studio/shared";

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

  it("prioritizes loading style.anchor_image_url when present for outfit continuity lock", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-anchor-"));
    roots.push(root);
    const app = await buildApp(root);

    // 1. Create mascot with master image
    const mascot = await app.repository.saveMascot({
      name: "Captain Cyber",
      description: "A futuristic robotic fox companion",
      visual_style: "pixar_3d",
      master_prompt: "Futuristic chrome cyber fox with glowing blue optics",
      color_theme: "#06b6d4",
    });
    const masterUrl = await app.repository.saveMascotAsset(mascot.id, "master_concept_1.png", Buffer.from("<svg>master</svg>", "utf8"));
    const mascotWithMaster = await app.repository.saveMascot({
      ...mascot,
      master_image_url: masterUrl,
    });

    // 2. Create style
    const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascotWithMaster.id, {
      name: "Cyber Ninja",
      keyword: "stealth cyber armor katana holographic visor",
    });

    // 3. Save anchor image and update style.anchor_image_url
    const anchorUrl = await app.repository.saveMascotAsset(
      mascot.id,
      "style_ninja_anchor.png",
      Buffer.from("<svg>ninja anchor</svg>", "utf8"),
    );
    const updatedMascot = await app.repository.saveMascot({
      ...mascotWithStyle,
      styles: (mascotWithStyle.styles || []).map((s) => (s.id === style.id ? { ...s, anchor_image_url: anchorUrl } : s)),
    });

    // 4. Generate slot 1
    const result = await generateMascotStyleSlot(
      app.repository,
      updatedMascot,
      style.id,
      {
        style_id: style.id,
        state: "thinking",
        slot_index: 1,
        prompt_modifier: "crouched on rooftop observing data stream",
      },
      testImageConfig,
    );

    // Verify outfit continuity directive is locked and costume directive is NOT duplicated
    expect(result.prompt_used).toContain("@1");
    expect(result.prompt_used).toContain(
      'Strictly preserve character identity, outfit, costume details, colors, and accessories from @1 for "Captain Cyber". The character must wear the exact same costume shown in @1; only modify the pose, action, and facial expression.',
    );
    expect(result.prompt_used).not.toContain("Theme & Costume:");
    expect(result.prompt_used).toContain("Pose and Action: crouched on rooftop observing data stream.");
    expect(validateMascotPromptContract(result.prompt_used, true)).toBe(true);
  });

  it("falls back to mascot.master_image_url when style.anchor_image_url is null or absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-fallback-"));
    roots.push(root);
    const app = await buildApp(root);

    // 1. Create mascot with master image
    const mascot = await app.repository.saveMascot({
      name: "Captain Cyber",
      description: "A futuristic robotic fox companion",
      visual_style: "pixar_3d",
      master_prompt: "Futuristic chrome cyber fox with glowing blue optics",
      color_theme: "#06b6d4",
    });
    const masterUrl = await app.repository.saveMascotAsset(mascot.id, "master_concept_1.png", Buffer.from("<svg>master</svg>", "utf8"));
    const mascotWithMaster = await app.repository.saveMascot({
      ...mascot,
      master_image_url: masterUrl,
    });

    // 2. Create style where anchor_image_url is absent
    const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascotWithMaster.id, {
      name: "Cyber Ninja",
      keyword: "stealth cyber armor katana holographic visor",
    });
    expect(style.anchor_image_url).toBeFalsy();

    // 3. Generate slot 1
    const result = await generateMascotStyleSlot(
      app.repository,
      mascotWithStyle,
      style.id,
      {
        style_id: style.id,
        state: "thinking",
        slot_index: 1,
        prompt_modifier: "pondering data streams",
      },
      testImageConfig,
    );

    // Falls back to master identity continuity + costume directive
    expect(result.prompt_used).toContain("@1");
    expect(result.prompt_used).toContain('Strictly preserve character identity from @1 for "Captain Cyber"');
    expect(result.prompt_used).toContain("face, fur/skin tone, eye shape, and chibi 1:2 head-to-body proportions");
    expect(result.prompt_used).toContain(
      "Theme & Costume: Styled in authentic stealth cyber armor katana holographic visor attire and accessories.",
    );
    expect(result.prompt_used).not.toContain("The character must wear the exact same costume shown in @1");
    expect(validateMascotPromptContract(result.prompt_used, true)).toBe(true);
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

  it("batch generation of multiple empty slots assigns distinct, non-overlapping poses from the 20-pose library", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-batch-poses-"));
    roots.push(root);
    const app = await buildApp(root);

    const mascot = await app.repository.saveMascot({
      name: "Professor Paws",
      description: "A scholar cat with spectacles",
      visual_style: "pixar_3d",
    });

    const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascot.id, {
      name: "Scholar Uniform",
      keyword: "tweed vest round spectacles pocket watch",
    });

    // Batch generate all 10 slots for "thinking"
    const batchResult = await generateMascotStyleBatch(
      app.repository,
      mascotWithStyle,
      style.id,
      {
        style_id: style.id,
        state: "thinking",
      },
      testImageConfig,
    );

    expect(batchResult.generated_count).toBe(10);
    const thinkingSlots = batchResult.mascot.styles?.find((s) => s.id === style.id)?.states.thinking || [];
    expect(thinkingSlots.length).toBe(10);

    const allThinkingPoses = getMascotPoses("thinking");
    const validPrompts = new Set(allThinkingPoses.map((p) => p.prompt));
    const assignedPrompts = new Set<string>();

    for (const slot of thinkingSlots) {
      expect(slot.image_url).toBeTruthy();
      expect(slot.prompt_modifier).toBeTruthy();
      expect(validPrompts.has(slot.prompt_modifier!)).toBe(true);
      assignedPrompts.add(slot.prompt_modifier!);
    }

    // All 10 slots must have distinct, non-overlapping poses
    expect(assignedPrompts.size).toBe(10);
  });

  it("single-slot regeneration with omitted prompt modifier picks an unused pose different from the other slots in the style", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-slot-reroll-pose-"));
    roots.push(root);
    const app = await buildApp(root);

    const mascot = await app.repository.saveMascot({
      name: "Professor Paws",
      description: "A scholar cat with spectacles",
      visual_style: "pixar_3d",
    });

    const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascot.id, {
      name: "Scholar Uniform",
      keyword: "tweed vest round spectacles pocket watch",
    });

    // Pre-populate 9 slots (slots 1..9) with the first 9 poses from the 20-pose library
    const allPoses = getMascotPoses("celebrate");
    let currentMascot = mascotWithStyle;
    for (let i = 1; i <= 9; i++) {
      currentMascot = await app.repository.updateMascotSlot(mascot.id, {
        style_id: style.id,
        state: "celebrate",
        slot_index: i,
        image_url: `/api/mascots/assets/celeb_${i}.png`,
        prompt_modifier: allPoses[i - 1].prompt,
      });
    }

    // Now generate slot 10 with prompt_modifier omitted
    const result = await generateMascotStyleSlot(
      app.repository,
      currentMascot,
      style.id,
      {
        style_id: style.id,
        state: "celebrate",
        slot_index: 10,
      },
      testImageConfig,
    );

    const usedPrompts = new Set(allPoses.slice(0, 9).map((p) => p.prompt));
    expect(result.slot.prompt_modifier).toBeTruthy();
    // Must NOT pick any of the other 9 slots' poses
    expect(usedPrompts.has(result.slot.prompt_modifier!)).toBe(false);

    // Verify it is permanently saved in the repository
    const storedMascot = await app.repository.getMascot(mascot.id);
    const storedSlot = storedMascot.styles?.find((s) => s.id === style.id)?.states.celebrate.find((s) => s.slot_index === 10);
    expect(storedSlot?.prompt_modifier).toBe(result.slot.prompt_modifier);
  });

  it("new custom style isolates its pose usage from Core Style", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-custom-style-isolation-"));
    roots.push(root);
    const app = await buildApp(root);

    const mascot = await app.repository.saveMascot({
      name: "Sparky Robo",
      description: "A high-tech electric robot",
      visual_style: "pixar_3d",
    });

    // 1. In default 'core' style, fill thinking slot 1 with a known pose
    const corePose = getMascotPoses("thinking")[0].prompt;
    const currentMascot = await app.repository.updateMascotSlot(mascot.id, {
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      image_url: "/api/mascots/assets/core_think_1.png",
      prompt_modifier: corePose,
    });

    // 2. Create a new custom style
    const { mascot: mascotWithCustom, style: customStyle } = await app.repository.createMascotStyle(currentMascot.id, {
      name: "Cyber Punk",
      keyword: "neon mohawk chrome leather jacket",
    });

    // Verify the custom style has all slots empty initially
    const customThinking = customStyle.states.thinking;
    for (const slot of customThinking) {
      expect(slot.image_url).toBe("");
    }

    // 3. Generate slot 1 in custom style with a specific prompt modifier
    const customSlotResult = await generateMascotStyleSlot(
      app.repository,
      mascotWithCustom,
      customStyle.id,
      {
        style_id: customStyle.id,
        state: "thinking",
        slot_index: 1,
        prompt_modifier: corePose, // Custom style can re-use poses independently of core style
      },
      testImageConfig,
    );

    // Verify prompt compiles with the custom style's theme keyword cleanly
    expect(customSlotResult.prompt_used).toContain("neon mohawk chrome leather jacket");
    expect(customSlotResult.prompt_used).toContain(corePose);

    // 4. Batch generate slots 2..10 in custom style
    const batchCustom = await generateMascotStyleBatch(
      app.repository,
      customSlotResult.mascot,
      customStyle.id,
      {
        style_id: customStyle.id,
        state: "thinking",
      },
      testImageConfig,
    );

    expect(batchCustom.generated_count).toBe(9);
    const updatedCustomSlots = batchCustom.mascot.styles?.find((s) => s.id === customStyle.id)?.states.thinking || [];

    // All slots in custom style must be filled and non-empty
    for (const s of updatedCustomSlots) {
      expect(s.image_url).toBeTruthy();
      expect(s.prompt_modifier).toBeTruthy();
    }

    // Ensure core style was completely untouched
    const coreStyleAfter = batchCustom.mascot.styles?.find((s) => s.id === "core");
    expect(coreStyleAfter?.states.thinking[0]?.image_url).toBe("/api/mascots/assets/core_think_1.png");
    expect(coreStyleAfter?.states.thinking.find((s) => s.slot_index === 2)?.image_url ?? "").toBe("");
  });

  describe("Mascot Background Matting for Style Variants & Route Robustness", () => {
    function createTestOpaquePng(): Uint8Array {
      // 10x10 image with solid white background (255, 255, 255, 255) and blue center (0, 100, 255, 255)
      const width = 10;
      const height = 10;
      const data = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const inCenter = x >= 3 && x <= 6 && y >= 3 && y <= 6;
          if (inCenter) {
            data[idx] = 0;
            data[idx + 1] = 100;
            data[idx + 2] = 255;
            data[idx + 3] = 255;
          } else {
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = 255;
          }
        }
      }
      return encodeRgbaToPng({ width, height, data });
    }

    it("parses style slot targets from objects and string expressions correctly", () => {
      // Objects
      expect(parseStyleSlotTarget({ style_id: "s1", state: "thinking", slot_index: 3 })).toEqual({
        styleId: "s1",
        state: "thinking",
        slotIndex: 3,
      });
      expect(parseStyleSlotTarget({ styleId: "s2", state: "celebrate", slotIndex: 5 })).toEqual({
        styleId: "s2",
        state: "celebrate",
        slotIndex: 5,
      });
      expect(parseStyleSlotTarget({ state: "thinking", slot_index: 2 })).toEqual({
        styleId: undefined,
        state: "thinking",
        slotIndex: 2,
      });

      // Strings
      expect(parseStyleSlotTarget("style:ninja:thinking:2")).toEqual({
        styleId: "ninja",
        state: "thinking",
        slotIndex: 2,
      });
      expect(parseStyleSlotTarget("slot:ninja:celebrate:4")).toEqual({
        styleId: "ninja",
        state: "celebrate",
        slotIndex: 4,
      });
      expect(parseStyleSlotTarget("cyber:thinking:5")).toEqual({
        styleId: "cyber",
        state: "thinking",
        slotIndex: 5,
      });
      expect(parseStyleSlotTarget("thinking:1")).toEqual({
        state: "thinking",
        slotIndex: 1,
      });
      expect(parseStyleSlotTarget("celebrate:10")).toEqual({
        state: "celebrate",
        slotIndex: 10,
      });
      expect(parseStyleSlotTarget("style:ninja")).toEqual({
        styleId: "ninja",
      });
      expect(parseStyleSlotTarget("style:ninja:thinking")).toEqual({
        styleId: "ninja",
        state: "thinking",
      });
      expect(parseStyleSlotTarget("slot:8")).toEqual({
        slotIndex: 8,
      });

      // JSON string
      expect(parseStyleSlotTarget(JSON.stringify({ style_id: "s1", state: "celebrate", slot_index: 4 }))).toEqual({
        styleId: "s1",
        state: "celebrate",
        slotIndex: 4,
      });

      // Invalid or non-matching targets
      expect(parseStyleSlotTarget("all")).toBeNull();
      expect(parseStyleSlotTarget("master")).toBeNull();
      expect(parseStyleSlotTarget("wave")).toBeNull();
      expect(parseStyleSlotTarget(null)).toBeNull();
      expect(parseStyleSlotTarget(undefined)).toBeNull();
    });

    it("removes background from master, actions, and all filled style variant slots when target is 'all'", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-matting-all-"));
      roots.push(root);
      const app = await buildApp(root);

      // 1. Create mascot
      const mascot = await app.repository.saveMascot({
        name: "Sparky Fox",
        description: "An electric fox mascot",
        visual_style: "pixar_3d",
      });

      // 2. Save master image
      const masterOpaque = createTestOpaquePng();
      const masterUrl = await app.repository.saveMascotAsset(mascot.id, "master.png", masterOpaque);

      // 3. Save action sprite (e.g. wave)
      const waveOpaque = createTestOpaquePng();
      const waveUrl = await app.repository.saveMascotAsset(mascot.id, "sprite_wave.png", waveOpaque);

      // 4. Create style with filled slots in thinking and celebrate
      const { mascot: mascotWithStyle, style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Thunder Knight",
        keyword: "golden armor lightning crest",
      });

      const think1Opaque = createTestOpaquePng();
      const think1Url = await app.repository.saveMascotAsset(mascot.id, "style_thunder_think_1.png", think1Opaque);
      const think2Opaque = createTestOpaquePng();
      const think2Url = await app.repository.saveMascotAsset(mascot.id, "style_thunder_think_2.png", think2Opaque);
      const celeb1Opaque = createTestOpaquePng();
      const celeb1Url = await app.repository.saveMascotAsset(mascot.id, "style_thunder_celeb_1.png", celeb1Opaque);

      // Update slots in mascot
      let updatedMascot = await app.repository.saveMascot({
        ...mascotWithStyle,
        master_image_url: masterUrl,
        actions: {
          wave: {
            action: "wave",
            sprite_url: waveUrl,
            frames_count: 1,
            fps: 12,
            loop: false,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
          },
        },
      });

      updatedMascot = await app.repository.updateMascotSlot(updatedMascot.id, {
        style_id: style.id,
        state: "thinking",
        slot_index: 1,
        image_url: think1Url,
      });
      updatedMascot = await app.repository.updateMascotSlot(updatedMascot.id, {
        style_id: style.id,
        state: "thinking",
        slot_index: 2,
        image_url: think2Url,
      });
      updatedMascot = await app.repository.updateMascotSlot(updatedMascot.id, {
        style_id: style.id,
        state: "celebrate",
        slot_index: 1,
        image_url: celeb1Url,
      });

      // Verify initial pixels are opaque (alpha = 255)
      const initialThink1File = await app.repository.getMascotAssetFile(mascot.id, "style_thunder_think_1.png");
      const initialThink1Bytes = await readFile(initialThink1File.absolutePath);
      expect(decodePngToRgba(initialThink1Bytes).data[3]).toBe(255);

      // 5. Execute background removal with target === "all"
      const mattedMascot = await removeMascotAssetBackground(app.repository, updatedMascot.id, "all");

      // 6. Verify master image is matted
      const mattedMasterFile = await app.repository.getMascotAssetFile(mascot.id, "master.png");
      const mattedMasterBytes = await readFile(mattedMasterFile.absolutePath);
      expect(decodePngToRgba(mattedMasterBytes).data[3]).toBe(0);

      // 7. Verify action sprite is matted
      const mattedWaveFile = await app.repository.getMascotAssetFile(mascot.id, "sprite_wave.png");
      const mattedWaveBytes = await readFile(mattedWaveFile.absolutePath);
      expect(decodePngToRgba(mattedWaveBytes).data[3]).toBe(0);

      // 8. Verify all filled style variant slots are matted
      const mattedThink1File = await app.repository.getMascotAssetFile(mascot.id, "style_thunder_think_1.png");
      const mattedThink1Bytes = await readFile(mattedThink1File.absolutePath);
      expect(decodePngToRgba(mattedThink1Bytes).data[3]).toBe(0);

      const mattedThink2File = await app.repository.getMascotAssetFile(mascot.id, "style_thunder_think_2.png");
      const mattedThink2Bytes = await readFile(mattedThink2File.absolutePath);
      expect(decodePngToRgba(mattedThink2Bytes).data[3]).toBe(0);

      const mattedCeleb1File = await app.repository.getMascotAssetFile(mascot.id, "style_thunder_celeb_1.png");
      const mattedCeleb1Bytes = await readFile(mattedCeleb1File.absolutePath);
      expect(decodePngToRgba(mattedCeleb1Bytes).data[3]).toBe(0);

      // 9. Verify mascot profile has preserved/updated URLs
      const mattedStyle = mattedMascot.styles?.find((s) => s.id === style.id);
      expect(mattedStyle?.states.thinking[0]?.image_url).toBe(think1Url);
      expect(mattedStyle?.states.thinking[1]?.image_url).toBe(think2Url);
      expect(mattedStyle?.states.celebrate[0]?.image_url).toBe(celeb1Url);

      // Unfilled slots (slots 3..10) must remain empty string
      expect(mattedStyle?.states.thinking[2]?.image_url).toBe("");
      expect(mattedStyle?.states.celebrate[1]?.image_url).toBe("");
    });

    it("removes background from a specific style slot cleanly without modifying other slots", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-matting-slot-"));
      roots.push(root);
      const app = await buildApp(root);

      const mascot = await app.repository.saveMascot({
        name: "Blaze Dragon",
        description: "A small fire dragon",
        visual_style: "pixar_3d",
      });

      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Dragon Armor",
        keyword: "obsidian dragon plate scales",
      });

      const slot1Opaque = createTestOpaquePng();
      const slot1Url = await app.repository.saveMascotAsset(mascot.id, "dragon_slot_1.png", slot1Opaque);
      const slot2Opaque = createTestOpaquePng();
      const slot2Url = await app.repository.saveMascotAsset(mascot.id, "dragon_slot_2.png", slot2Opaque);

      let updatedMascot = await app.repository.updateMascotSlot(mascot.id, {
        style_id: style.id,
        state: "thinking",
        slot_index: 1,
        image_url: slot1Url,
      });
      updatedMascot = await app.repository.updateMascotSlot(updatedMascot.id, {
        style_id: style.id,
        state: "thinking",
        slot_index: 2,
        image_url: slot2Url,
      });

      // 1. Remove background ONLY for thinking slot 2 via object target
      await removeMascotAssetBackground(app.repository, updatedMascot.id, {
        style_id: style.id,
        state: "thinking",
        slot_index: 2,
      });

      // Slot 2 must now be transparent
      const slot2File = await app.repository.getMascotAssetFile(mascot.id, "dragon_slot_2.png");
      const slot2Bytes = await readFile(slot2File.absolutePath);
      expect(decodePngToRgba(slot2Bytes).data[3]).toBe(0);

      // Slot 1 must still be opaque (untouched)
      const slot1File = await app.repository.getMascotAssetFile(mascot.id, "dragon_slot_1.png");
      const slot1Bytes = await readFile(slot1File.absolutePath);
      expect(decodePngToRgba(slot1Bytes).data[3]).toBe(255);

      // 2. Remove background for thinking slot 1 via string target
      await removeMascotAssetBackground(app.repository, updatedMascot.id, `style:${style.id}:thinking:1`);

      // Slot 1 must now also be transparent
      const slot1UpdatedFile = await app.repository.getMascotAssetFile(mascot.id, "dragon_slot_1.png");
      const slot1UpdatedBytes = await readFile(slot1UpdatedFile.absolutePath);
      expect(decodePngToRgba(slot1UpdatedBytes).data[3]).toBe(0);
    });

    it("handles HTTP remove-background endpoint with style variants on target 'all'", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "mascot-matting-http-"));
      roots.push(root);
      const app = await buildApp(root);

      // Create mascot
      const mascot = await app.repository.saveMascot({
        name: "Cosmo Rabbit",
        description: "An astronaut rabbit",
        visual_style: "flat_vector",
      });

      // Create style
      const { style } = await app.repository.createMascotStyle(mascot.id, {
        name: "Space Gear",
        keyword: "bubble helmet lunar boots",
      });

      // Add opaque PNG variant
      const thinkOpaque = createTestOpaquePng();
      const thinkUrl = await app.repository.saveMascotAsset(mascot.id, "cosmo_think_1.png", thinkOpaque);
      await app.repository.updateMascotSlot(mascot.id, {
        style_id: style.id,
        state: "thinking",
        slot_index: 1,
        image_url: thinkUrl,
      });

      // Invoke HTTP POST /api/mascots/:mascotId/remove-background with target: "all"
      const removeBgRes = await app.server.inject({
        method: "POST",
        url: `/api/mascots/${mascot.id}/remove-background`,
        payload: { target: "all" },
      });

      expect(removeBgRes.statusCode).toBe(200);
      const resBody = removeBgRes.json<{ mascot: MascotProfile }>();
      expect(resBody.mascot.id).toBe(mascot.id);

      // Verify on disk that the asset was matted
      const file = await app.repository.getMascotAssetFile(mascot.id, "cosmo_think_1.png");
      const bytes = await readFile(file.absolutePath);
      expect(decodePngToRgba(bytes).data[3]).toBe(0);
    });
  });
});
