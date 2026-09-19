import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
import type { AppConfig, MascotProfile, UploadMascotConceptResponse } from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import {
  generateMascotStyleConcept,
  generateMascotStyleSlot,
  loadMasterReferenceImageBase64,
  resolveSlotReferenceImage,
} from "../src/quiz/mascot/artGenerator.js";
import { validateMascotPromptContract } from "../src/quiz/mascotPromptContract.js";

const isVitest = Boolean(process.env.VITEST);
const runner = isVitest ? await import("vitest") : await import("node:test");
const describe = runner.describe;
const it = runner.it;
const afterEach = runner.afterEach;

const testImageConfig: AppConfig["image_generation"] = {
  enabled: false,
  provider: "shopaikey",
  model: "gpt-image-2",
  api_key: "",
};

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })));
});

async function createTestApp(): Promise<{ app: StudioApp; root: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-concept-upload-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const app = await buildApp(root);
  return { app, root };
}

async function createSamplePngBase64(color = { r: 6, g: 182, b: 212, alpha: 1 }): Promise<string> {
  const buffer = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toBuffer();
  return buffer.toString("base64");
}

describe("Mascot Style & Slot Generation Engine Synchronization Pipeline", () => {
  it("Test 1: uploads master concept image for a mascot with concept_origin: user_uploaded and verifies reference loading", async () => {
    const { app } = await createTestApp();

    const sampleBase64 = await createSamplePngBase64();
    const uploadRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots/upload-concept",
      payload: {
        image_data: `data:image/png;base64,${sampleBase64}`,
        name: "Neon Lynx",
        description: "A futuristic cybernetic feline companion",
        visual_style: "pixar_3d",
        color_theme: "#06b6d4",
        auto_matting: true,
      },
    });

    assert.equal(uploadRes.statusCode, 201, "Concept upload should succeed with status 201");
    const parsed = uploadRes.json<UploadMascotConceptResponse>();
    const mascot = parsed.mascot;

    // Verify concept_origin and master asset URLs
    assert.equal(mascot.concept_origin, "user_uploaded", "Mascot concept_origin must be user_uploaded");
    assert.ok(mascot.master_image_url, "Mascot must have master_image_url");
    assert.ok(mascot.master_raw_image_url, "Mascot must have master_raw_image_url");

    // Verify files physically exist in repository
    const masterFilename = mascot.master_image_url.split("/").pop()!;
    const rawFilename = mascot.master_raw_image_url.split("/").pop()!;
    const masterFileInfo = await app.repository.getMascotAssetFile(mascot.id, masterFilename);
    const rawFileInfo = await app.repository.getMascotAssetFile(mascot.id, rawFilename);
    assert.ok(masterFileInfo.size > 0, "Master image file on disk must be non-empty");
    assert.ok(rawFileInfo.size > 0, "Raw master image file on disk must be non-empty");

    // Verify Core Style is synchronized with master image URL
    const coreStyle = mascot.styles?.find((s) => s.id === "core" || s.is_default);
    assert.ok(coreStyle, "Core Style must exist in mascot styles");
    assert.equal(coreStyle.anchor_image_url, mascot.master_image_url, "Core Style anchor must match master_image_url");

    // Verify loadMasterReferenceImageBase64 loads the master reference
    const masterRefBase64 = await loadMasterReferenceImageBase64(app.repository, mascot);
    assert.ok(masterRefBase64, "loadMasterReferenceImageBase64 must return a reference image string");
    assert.ok(
      masterRefBase64.startsWith("data:image/png;base64,"),
      "Master reference must resolve to a valid data:image/png;base64 URL",
    );

    // Verify raw fallback if master_image_url is unavailable
    const mascotWithOnlyRaw: MascotProfile = {
      ...mascot,
      master_image_url: null,
    };
    const rawRefBase64 = await loadMasterReferenceImageBase64(app.repository, mascotWithOnlyRaw);
    assert.ok(rawRefBase64, "loadMasterReferenceImageBase64 must fallback to master_raw_image_url");
    assert.ok(
      rawRefBase64.startsWith("data:image/png;base64,"),
      "Raw reference fallback must resolve to a valid data:image/png;base64 URL",
    );
  });

  it("Test 2: calls generateMascotStyleConcept for a new style and verifies visual reference preservation", async () => {
    const { app } = await createTestApp();

    const sampleBase64 = await createSamplePngBase64();
    const uploadRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots/upload-concept",
      payload: {
        image_data: `data:image/png;base64,${sampleBase64}`,
        name: "Cyber Lynx",
        description: "A nimble feline companion",
        visual_style: "pixar_3d",
        color_theme: "#06b6d4",
      },
    });
    const { mascot: uploadedMascot } = uploadRes.json<UploadMascotConceptResponse>();

    // Add a new custom style 'style_cyberpunk'
    const newStyleId = "style_cyberpunk";
    const newStyle = {
      id: newStyleId,
      name: "Cyberpunk",
      keyword: "neon cyber armor glowing visor",
      is_default: false,
      anchor_image_url: null,
      raw_anchor_image_url: null,
      states: { thinking: [], celebrate: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const mascotWithStyle: MascotProfile = {
      ...uploadedMascot,
      styles: [...(uploadedMascot.styles || []), newStyle],
    };
    await app.repository.saveMascot(mascotWithStyle);

    // Call generateMascotStyleConcept
    const result = await generateMascotStyleConcept(app.repository, mascotWithStyle, newStyleId, testImageConfig);

    // Verify prompt incorporates reference preservation cues and adheres to contract
    assert.ok(result.prompt_used.includes("@1"), "Concept prompt must reference master concept via @1");
    assert.ok(
      result.prompt_used.includes('Strictly preserve character identity from @1 for "Cyber Lynx"'),
      "Prompt must include character identity directive",
    );
    assert.ok(
      result.prompt_used.includes(
        "Preserve the exact character identity, color palette, and recognizable anatomical features from the reference image, while re-imagining the character in the specified theme/style: Cyberpunk (neon cyber armor glowing visor)",
      ),
      "Prompt must inject explicit reference preservation instructions for user_uploaded mascot",
    );
    assert.ok(
      validateMascotPromptContract(result.prompt_used, true),
      "Generated prompt must satisfy the mascot prompt contract",
    );

    // Verify generated style anchor is saved to disk
    assert.ok(result.anchor_image_url, "Style anchor image URL must be returned");
    assert.ok(result.raw_image_url, "Style raw anchor image URL must be returned");
    const anchorFilename = result.anchor_image_url.split("/").pop()!;
    const anchorFileInfo = await app.repository.getMascotAssetFile(uploadedMascot.id, anchorFilename);
    assert.ok(anchorFileInfo.size > 0, "Style anchor file on disk must be non-empty");

    // Verify mascot profile is updated and Core Style remains anchored to uploaded master concept
    const reloaded = await app.repository.getMascot(uploadedMascot.id);
    const updatedCustomStyle = reloaded.styles?.find((s) => s.id === newStyleId);
    assert.equal(
      updatedCustomStyle?.anchor_image_url,
      result.anchor_image_url,
      "Custom style anchor_image_url must be updated",
    );

    const reloadedCoreStyle = reloaded.styles?.find((s) => s.id === "core" || s.is_default);
    assert.ok(reloadedCoreStyle, "Core Style must exist");
    assert.equal(
      reloadedCoreStyle.anchor_image_url,
      uploadedMascot.master_image_url,
      "Core Style must remain strictly anchored to uploaded master concept",
    );
  });

  it("Test 3: calls generateMascotStyleSlot under uploaded mascot Core Style and verifies reference fidelity", async () => {
    const { app } = await createTestApp();

    const sampleBase64 = await createSamplePngBase64();
    const uploadRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots/upload-concept",
      payload: {
        image_data: `data:image/png;base64,${sampleBase64}`,
        name: "Aero Griffin",
        description: "A regal winged companion",
        visual_style: "pixar_3d",
        color_theme: "#3b82f6",
      },
    });
    const { mascot: uploadedMascot } = uploadRes.json<UploadMascotConceptResponse>();

    // Test resolveSlotReferenceImage for Core Style directly
    const coreStyle = uploadedMascot.styles?.find((s) => s.id === "core" || s.is_default);
    assert.ok(coreStyle, "Core Style must exist");
    const resolvedRef = await resolveSlotReferenceImage(app.repository, uploadedMascot, coreStyle);
    assert.equal(resolvedRef.hasStyleAnchor, false, "Core Style must not treat master concept as separate style anchor");
    assert.ok(resolvedRef.referenceImageBase64, "Core Style must resolve the master concept reference image base64");

    // Call generateMascotStyleSlot for state 'thinking' slot 1
    const slotResult = await generateMascotStyleSlot(
      app.repository,
      uploadedMascot,
      coreStyle.id,
      {
        style_id: coreStyle.id,
        state: "thinking",
        slot_index: 1,
      },
      testImageConfig,
    );

    // Verify prompt incorporates reference preservation cues
    assert.ok(slotResult.prompt_used.includes("@1"), "Core Style slot prompt must reference master concept via @1");
    assert.ok(
      slotResult.prompt_used.includes('Strictly preserve character identity from @1 for "Aero Griffin"'),
      "Slot prompt must enforce identity continuity",
    );
    assert.ok(
      slotResult.prompt_used.includes(
        "Maintain strong fidelity to the reference image character identity, color palette, and recognizable anatomical features",
      ),
      "Core Style slot prompt must enforce strong visual fidelity to the reference image",
    );
    assert.ok(
      validateMascotPromptContract(slotResult.prompt_used, true),
      "Slot prompt must satisfy the 16:9 / isolation contract",
    );

    // Verify slot asset persistence
    assert.ok(slotResult.slot.image_url, "Slot must have image_url");
    const slotFilename = slotResult.slot.image_url.split("/").pop()!;
    const slotFileInfo = await app.repository.getMascotAssetFile(uploadedMascot.id, slotFilename);
    assert.ok(slotFileInfo.size > 0, "Slot image file on disk must be non-empty");

    // Verify updated mascot profile has the slot registered under Core Style
    const reloaded = await app.repository.getMascot(uploadedMascot.id);
    const updatedCore = reloaded.styles?.find((s) => s.id === coreStyle.id);
    assert.equal(updatedCore?.states.thinking?.length, 1, "Core Style must contain 1 thinking slot");
    assert.equal(updatedCore?.states.thinking?.[0]?.slot_index, 1, "Registered slot must have slot_index 1");
  });

  it("Test 4: calls generateMascotStyleSlot under custom style with style anchor and tests graceful fallback", async () => {
    const { app } = await createTestApp();

    const sampleBase64 = await createSamplePngBase64();
    const uploadRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots/upload-concept",
      payload: {
        image_data: `data:image/png;base64,${sampleBase64}`,
        name: "Shadow Drake",
        description: "A stealth obsidian dragon companion",
        visual_style: "pixar_3d",
        color_theme: "#8b5cf6",
      },
    });
    const { mascot: uploadedMascot } = uploadRes.json<UploadMascotConceptResponse>();

    // 1. Add custom style with generated style anchor
    const customStyleId = "style_stealth";
    const anchorBytes = Buffer.from(sampleBase64, "base64");
    const anchorUrl = await app.repository.saveMascotAsset(
      uploadedMascot.id,
      "style_stealth_anchor_test.png",
      anchorBytes,
    );

    const customStyleWithAnchor = {
      id: customStyleId,
      name: "Stealth Ninja",
      keyword: "stealth shinobi wrap smoke kunai",
      is_default: false,
      anchor_image_url: anchorUrl,
      raw_anchor_image_url: anchorUrl,
      states: { thinking: [], celebrate: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 2. Add another custom style without anchor to test graceful fallback
    const fallbackStyleId = "style_glacier";
    const customStyleWithoutAnchor = {
      id: fallbackStyleId,
      name: "Glacier Frost",
      keyword: "crystalline ice armor frost cloak",
      is_default: false,
      anchor_image_url: null,
      raw_anchor_image_url: null,
      states: { thinking: [], celebrate: [] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mascotWithStyles: MascotProfile = {
      ...uploadedMascot,
      styles: [...(uploadedMascot.styles || []), customStyleWithAnchor, customStyleWithoutAnchor],
    };
    await app.repository.saveMascot(mascotWithStyles);

    // Test 4A: Generate slot for custom style WITH style anchor
    const refWithAnchor = await resolveSlotReferenceImage(app.repository, mascotWithStyles, customStyleWithAnchor);
    assert.equal(refWithAnchor.hasStyleAnchor, true, "Style with anchor must report hasStyleAnchor: true");
    assert.ok(refWithAnchor.referenceImageBase64, "Must load custom style anchor reference image");

    const anchoredSlotResult = await generateMascotStyleSlot(
      app.repository,
      mascotWithStyles,
      customStyleId,
      {
        style_id: customStyleId,
        state: "celebrate",
        slot_index: 1,
      },
      testImageConfig,
    );

    assert.ok(anchoredSlotResult.prompt_used.includes("@1"), "Slot prompt must reference @1");
    assert.ok(
      anchoredSlotResult.prompt_used.includes(
        'Strictly preserve character identity, outfit, costume details, colors, and accessories from @1 for "Shadow Drake"',
      ),
      "Slot prompt must enforce exact costume preservation from style anchor",
    );
    assert.ok(
      anchoredSlotResult.prompt_used.includes(
        "Maintain strict fidelity to the reference image character identity, color palette, and recognizable anatomical features",
      ),
      "Slot prompt must enforce fidelity to style anchor reference image",
    );
    assert.ok(
      !anchoredSlotResult.prompt_used.includes("Theme & Costume:"),
      "Slot prompt should not repeat Theme & Costume when style anchor is active",
    );

    // Test 4B: Generate slot for custom style WITHOUT style anchor (graceful fallback)
    const refWithoutAnchor = await resolveSlotReferenceImage(app.repository, mascotWithStyles, customStyleWithoutAnchor);
    assert.equal(
      refWithoutAnchor.hasStyleAnchor,
      false,
      "Style without anchor must report hasStyleAnchor: false and fallback",
    );
    assert.ok(refWithoutAnchor.referenceImageBase64, "Must fall back to master concept reference image");

    const fallbackSlotResult = await generateMascotStyleSlot(
      app.repository,
      mascotWithStyles,
      fallbackStyleId,
      {
        style_id: fallbackStyleId,
        state: "thinking",
        slot_index: 1,
      },
      testImageConfig,
    );

    assert.ok(fallbackSlotResult.prompt_used.includes("@1"), "Fallback prompt must reference @1");
    assert.ok(
      fallbackSlotResult.prompt_used.includes(
        "Theme & Costume: Styled in authentic crystalline ice armor frost cloak attire and accessories",
      ),
      "Fallback prompt must include costume directive from style keyword",
    );
    assert.ok(
      fallbackSlotResult.prompt_used.includes(
        "Maintain strong fidelity to the reference image character identity, color palette, and recognizable anatomical features",
      ),
      "Fallback prompt must enforce strong visual fidelity to the master reference",
    );
  });
});
