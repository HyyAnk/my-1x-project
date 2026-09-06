import { mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { MascotProfile, MascotStyle } from "@studio/shared";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Mascot Style Repository & Endpoints", () => {
  it("auto-migrates legacy mascot manifests lacking styles", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-test-"));
    roots.push(root);
    const app = await buildApp(root);

    // Seed legacy mascot manifest directly to disk
    const legacyMascotId = "legacy_owl_1";
    const mascotDir = path.join(app.repository.roots.mascots, legacyMascotId);
    await mkdir(path.join(mascotDir, "assets"), { recursive: true });

    const legacyManifest = {
      id: legacyMascotId,
      name: "Professor Hoot",
      description: "A wise owl",
      visual_style: "pixar_3d",
      master_prompt: "A wise owl with glasses",
      master_image_url: "/api/mascots/legacy_owl_1/assets/master.png",
      color_theme: "#10b981",
      actions: {
        thinking: {
          action: "thinking",
          sprite_url: "/api/mascots/legacy_owl_1/assets/thinking.png",
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
          motion_preset: "sway",
          motion_speed: 1.2,
          motion_intensity: "normal",
        },
        celebrate: {
          action: "celebrate",
          sprite_url: "/api/mascots/legacy_owl_1/assets/celebrate.png",
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
          motion_preset: "jump",
          motion_speed: 1.5,
          motion_intensity: "dynamic",
        },
      },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    await writeFile(path.join(mascotDir, "mascot.json"), JSON.stringify(legacyManifest), "utf8");

    // Test getMascot auto-migration
    const migrated = await app.repository.getMascot(legacyMascotId);
    expect(migrated.styles).toBeDefined();
    expect(migrated.styles?.length).toBe(1);
    expect(migrated.active_style_id).toBe("core");

    const coreStyle = migrated.styles![0]!;
    expect(coreStyle.id).toBe("core");
    expect(coreStyle.name).toBe("Core Style");
    expect(coreStyle.is_default).toBe(true);
    expect(coreStyle.states.thinking.length).toBe(1);
    expect(coreStyle.states.thinking[0]?.image_url).toBe("/api/mascots/legacy_owl_1/assets/thinking.png");
    expect(coreStyle.states.thinking[0]?.motion_preset).toBe("sway");
    expect(coreStyle.states.celebrate.length).toBe(1);
    expect(coreStyle.states.celebrate[0]?.image_url).toBe("/api/mascots/legacy_owl_1/assets/celebrate.png");
    expect(coreStyle.states.celebrate[0]?.motion_preset).toBe("jump");

    // Test saveMascot auto-migration
    const saved = await app.repository.saveMascot({
      name: "Fresh Mascot",
      description: "Without styles provided",
    });
    expect(saved.styles).toBeDefined();
    expect(saved.styles?.length).toBe(1);
    expect(saved.active_style_id).toBe("core");
    expect(saved.styles![0]?.id).toBe("core");

    // Verify persisted on disk
    const diskContent = JSON.parse(await readFile(path.join(app.repository.roots.mascots, saved.id, "mascot.json"), "utf8")) as MascotProfile;
    expect(diskContent.styles?.length).toBe(1);
    expect(diskContent.styles![0]?.id).toBe("core");
    expect(diskContent.active_style_id).toBe("core");
  });

  it("handles complete style lifecycle: create, update, delete, slot updates, and active style switching", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-test-"));
    roots.push(root);
    const app = await buildApp(root);

    // 1. Create a mascot
    const mascot = await app.repository.saveMascot({
      name: "Barnaby Bear",
      description: "A friendly grizzly bear",
    });
    expect(mascot.styles?.length).toBe(1);
    expect(mascot.active_style_id).toBe("core");

    // 2. Create a new style
    const { mascot: mascotWithStyle, style: newStyle } = await app.repository.createMascotStyle(mascot.id, {
      name: "Beach Party",
      keyword: "hawaiian shirt sunglasses",
    });
    expect(newStyle.id).toMatch(/^style_\d+/);
    expect(newStyle.name).toBe("Beach Party");
    expect(newStyle.keyword).toBe("hawaiian shirt sunglasses");
    expect(newStyle.is_default).toBe(false);
    expect(newStyle.states.thinking.length).toBe(10);
    expect(newStyle.states.celebrate.length).toBe(10);

    for (let i = 1; i <= 10; i++) {
      const thinkSlot = newStyle.states.thinking[i - 1]!;
      expect(thinkSlot.id).toBe(`slot_${i}`);
      expect(thinkSlot.slot_index).toBe(i);
      expect(thinkSlot.image_url).toBe("");

      const celebSlot = newStyle.states.celebrate[i - 1]!;
      expect(celebSlot.id).toBe(`slot_${i}`);
      expect(celebSlot.slot_index).toBe(i);
      expect(celebSlot.image_url).toBe("");
    }

    expect(mascotWithStyle.styles?.length).toBe(2);

    // 3. Update style name and keyword
    const updatedMascot = await app.repository.updateMascotStyle(mascot.id, newStyle.id, {
      name: "Beach Party V2",
      keyword: "swim shorts tropical",
    });
    const foundStyle = updatedMascot.styles?.find((s) => s.id === newStyle.id);
    expect(foundStyle?.name).toBe("Beach Party V2");
    expect(foundStyle?.keyword).toBe("swim shorts tropical");

    // 4. Update slot in style
    const slotUpdatedMascot = await app.repository.updateMascotSlot(mascot.id, {
      style_id: newStyle.id,
      state: "thinking",
      slot_index: 3,
      image_url: "/api/mascots/assets/think_3.png",
      prompt_modifier: "pondering with coconut drink",
      motion_preset: "pulse",
      motion_speed: 1.4,
      motion_intensity: "dynamic",
    });
    const updatedStyleInMascot = slotUpdatedMascot.styles?.find((s) => s.id === newStyle.id);
    const updatedSlot = updatedStyleInMascot?.states.thinking.find((s) => s.slot_index === 3);
    expect(updatedSlot?.image_url).toBe("/api/mascots/assets/think_3.png");
    expect(updatedSlot?.prompt_modifier).toBe("pondering with coconut drink");
    expect(updatedSlot?.motion_preset).toBe("pulse");
    expect(updatedSlot?.motion_speed).toBe(1.4);
    expect(updatedSlot?.motion_intensity).toBe("dynamic");

    // Verify other slots are unmodified
    const untouchedSlot = updatedStyleInMascot?.states.thinking.find((s) => s.slot_index === 1);
    expect(untouchedSlot?.image_url).toBe("");

    // 5. Set active style
    const activeChangedMascot = await app.repository.setActiveMascotStyle(mascot.id, newStyle.id);
    expect(activeChangedMascot.active_style_id).toBe(newStyle.id);

    // 6. Delete prevention: cannot delete core style
    await expect(app.repository.deleteMascotStyle(mascot.id, "core")).rejects.toThrow(
      "Cannot delete the default Core Style",
    );

    // 7. Delete custom style and verify active style resets to "core"
    const deletedMascot = await app.repository.deleteMascotStyle(mascot.id, newStyle.id);
    expect(deletedMascot.styles?.length).toBe(1);
    expect(deletedMascot.styles?.some((s) => s.id === newStyle.id)).toBe(false);
    expect(deletedMascot.active_style_id).toBe("core");
  });

  it("exposes style CRUD endpoints over HTTP routes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-http-test-"));
    roots.push(root);
    const app = await buildApp(root);

    // Create mascot
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

    // 1. POST /api/mascots/:mascotId/styles
    const styleRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles`,
      payload: {
        name: "Winter Explorer",
        keyword: "parka scarf goggles",
      },
    });
    expect(styleRes.statusCode).toBe(201);
    const { mascot: mascotWithStyle, style: createdStyle } = styleRes.json<{
      mascot: MascotProfile;
      style: MascotStyle;
    }>();
    expect(createdStyle.name).toBe("Winter Explorer");
    expect(createdStyle.keyword).toBe("parka scarf goggles");
    expect(createdStyle.states.thinking.length).toBe(10);
    expect(createdStyle.states.celebrate.length).toBe(10);
    expect(mascotWithStyle.styles?.length).toBe(2);

    // 2. PATCH /api/mascots/:mascotId/styles/:styleId
    const patchStyleRes = await app.server.inject({
      method: "PATCH",
      url: `/api/mascots/${mascot.id}/styles/${createdStyle.id}`,
      payload: {
        name: "Arctic Expedition",
        keyword: "heavy coat ice axe",
      },
    });
    expect(patchStyleRes.statusCode).toBe(200);
    const patchedMascot = patchStyleRes.json<{ mascot: MascotProfile }>().mascot;
    const patchedStyle = patchedMascot.styles?.find((s) => s.id === createdStyle.id);
    expect(patchedStyle?.name).toBe("Arctic Expedition");
    expect(patchedStyle?.keyword).toBe("heavy coat ice axe");

    // 3. PATCH /api/mascots/:mascotId/styles/:styleId/slots
    const patchSlotRes = await app.server.inject({
      method: "PATCH",
      url: `/api/mascots/${mascot.id}/styles/${createdStyle.id}/slots`,
      payload: {
        state: "celebrate",
        slot_index: 1,
        image_url: "/api/mascots/assets/arctic_celebrate_1.png",
        motion_preset: "jump",
        motion_speed: 1.2,
      },
    });
    expect(patchSlotRes.statusCode).toBe(200);
    const slotMascot = patchSlotRes.json<{ mascot: MascotProfile }>().mascot;
    const arcticStyle = slotMascot.styles?.find((s) => s.id === createdStyle.id);
    const celebrateSlot1 = arcticStyle?.states.celebrate.find((s) => s.slot_index === 1);
    expect(celebrateSlot1?.image_url).toBe("/api/mascots/assets/arctic_celebrate_1.png");
    expect(celebrateSlot1?.motion_preset).toBe("jump");

    // 4. POST /api/mascots/:mascotId/active-style
    const activeRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/active-style`,
      payload: {
        style_id: createdStyle.id,
      },
    });
    expect(activeRes.statusCode).toBe(200);
    const activeMascot = activeRes.json<{ mascot: MascotProfile }>().mascot;
    expect(activeMascot.active_style_id).toBe(createdStyle.id);

    // 5. DELETE /api/mascots/:mascotId/styles/core -> should return 400
    const deleteCoreRes = await app.server.inject({
      method: "DELETE",
      url: `/api/mascots/${mascot.id}/styles/core`,
    });
    expect(deleteCoreRes.statusCode).toBe(400);

    // 6. DELETE /api/mascots/:mascotId/styles/:styleId -> should delete and reset active style to core
    const deleteStyleRes = await app.server.inject({
      method: "DELETE",
      url: `/api/mascots/${mascot.id}/styles/${createdStyle.id}`,
    });
    expect(deleteStyleRes.statusCode).toBe(200);
    const deleteData = deleteStyleRes.json<{ ok: boolean; mascot: MascotProfile }>();
    expect(deleteData.ok).toBe(true);
    expect(deleteData.mascot.styles?.length).toBe(1);
    expect(deleteData.mascot.active_style_id).toBe("core");
  });
});
