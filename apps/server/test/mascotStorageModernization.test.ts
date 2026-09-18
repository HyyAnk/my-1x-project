import { mkdtemp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MASCOT_RENDER_CONTRACT_VERSION, type MascotProfile, type MascotActionType, type MascotSpriteAction } from "@studio/shared";
import {
  buildPersistedMascotProfile,
  areLegacyActionsEqual,
  generateLegacyActionsFromBundle,
  shouldPersistV2,
} from "../src/repository/mascotRenderPersistence.js";
import { buildCalibratedActionAsset, calibrateProfileRenderAction } from "../src/repository/mascotActionCalibration.js";
import { RepositoryService } from "../src/repository.js";
import { migrateMascotStorage } from "../src/repository/mascotMigration.js";

const tempRoots: string[] = [];

async function createRepositoryFixture(): Promise<RepositoryService> {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-persist-test-"));
  tempRoots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  const repo = new RepositoryService(root);
  await repo.ensureBootstrap();
  return repo;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
});

describe("Stage 1 Storage & Persistence Modernization", () => {
  describe("mascotRenderPersistence", () => {
    it("persists render_bundle and styles as primary source of truth without mutating actions", () => {
      const now = new Date().toISOString();
      const customActions: MascotProfile["actions"] = {
        thinking: {
          action: "thinking",
          sprite_url: "https://example.com/thinking.png",
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 10,
          offset_y: 20,
          motion_preset: "sway",
          motion_speed: 1.2,
          motion_intensity: "dynamic",
        },
      };

      const result = buildPersistedMascotProfile(
        {
          name: "Test Owl",
          description: "A friendly owl",
          actions: customActions,
        },
        null,
        "mascot_test_1",
        now,
      );

      // Must persist schema_version 2 (MASCOT_RENDER_CONTRACT_VERSION)
      expect(result.schema_version).toBe(MASCOT_RENDER_CONTRACT_VERSION);
      expect(result.render_bundle).toBeDefined();
      expect(result.render_bundle?.config.version).toBe(2);

      // Actions must NOT be mutated or transformed
      expect(result.actions).toEqual(customActions);

      // Styles must be synthesized with core style
      expect(result.styles).toBeDefined();
      expect(result.styles?.length).toBeGreaterThanOrEqual(1);
      expect(result.active_style_id).toBe("core");

      // Render bundle action must be present and adapted from initial action
      const bundleThinking = result.render_bundle?.assets.actions.thinking;
      expect(bundleThinking).toBeDefined();
      expect(bundleThinking?.image_url).toBe("https://example.com/thinking.png");
      expect(bundleThinking?.motion.preset).toBe("sway");
    });

    it("preserves calibrated render_bundle when updating other profile metadata", () => {
      const now = new Date().toISOString();
      const initial = buildPersistedMascotProfile(
        {
          name: "Initial Mascot",
          master_image_url: "https://example.com/master.png",
        },
        null,
        "mascot_2",
        now,
      );

      // Calibrate render_bundle directly
      const calibrated = calibrateProfileRenderAction(initial, "thinking", {
        offset_x: 45,
        offset_y: -30,
        pivot: { x: 200, y: 450 },
        motion_preset: "jump",
        motion_speed: 2.0,
        motion_intensity: "dynamic",
      });

      // Now save profile with only a name change, passing no render_bundle
      const updated = buildPersistedMascotProfile({ name: "Renamed Mascot" }, calibrated, "mascot_2", new Date().toISOString());

      // The calibrated values on render_bundle must be preserved intact!
      const actionAsset = updated.render_bundle?.assets.actions.thinking;
      expect(actionAsset).toBeDefined();
      expect(actionAsset?.registration.offset_x).toBe(45);
      expect(actionAsset?.registration.offset_y).toBe(-30);
      expect(actionAsset?.registration.pivot).toEqual({ x: 200, y: 450 });
      expect(actionAsset?.motion.preset).toBe("jump");
      expect(actionAsset?.motion.speed).toBe(2.0);
      expect(actionAsset?.motion.intensity).toBe("dynamic");
    });

    it("verifies deprecated helpers for backwards compatibility", () => {
      expect(shouldPersistV2()).toBe(true);

      const legacyActionA: MascotSpriteAction = {
        action: "thinking",
        sprite_url: "https://example.com/a.png",
        frames_count: 1,
        fps: 8,
        loop: true,
        frame_width: 512,
        frame_height: 512,
        offset_x: 0,
        offset_y: 0,
        motion_preset: "breathe",
        motion_speed: 1,
        motion_intensity: "normal",
      };
      const legacyActionB: MascotSpriteAction = { ...legacyActionA, offset_x: 10 };

      expect(areLegacyActionsEqual(legacyActionA, { ...legacyActionA })).toBe(true);
      expect(areLegacyActionsEqual(legacyActionA, legacyActionB)).toBe(false);

      const dummyBundle = {
        config: {
          version: 2 as const,
          placements: {
            "16:9": { anchor: "bottom_left" as const, scale: 1, offset_x: 0, offset_y: 0, flip_x: false },
            "9:16": { anchor: "bottom_left" as const, scale: 1, offset_x: 0, offset_y: 0, flip_x: false },
          },
          visibility: {
            enabled: true,
            phase_rules: {} as any,
            reveal_outcome_actions: { correct: "celebrate" as const, wrong: "thinking" as const, timeout: "thinking" as const },
          },
        },
        assets: { actions: {}, master: null },
      };
      expect(generateLegacyActionsFromBundle(dummyBundle)).toEqual({});
    });
  });

  describe("mascotActionCalibration", () => {
    it("calibrates registration offset, pivot, and motion directly on MascotActionAssetV2", () => {
      const baseAsset = {
        version: 2 as const,
        action: "thinking" as MascotActionType,
        image_url: "https://example.com/thinking.png",
        registration: {
          source_width: 512,
          source_height: 512,
          content_bounds: { x: 0, y: 0, width: 512, height: 512 },
          pivot: { x: 256, y: 512 },
          offset_x: 0,
          offset_y: 0,
        },
        motion: {
          preset: "breathe" as const,
          speed: 1,
          intensity: "normal" as const,
        },
      };

      const calibrated = buildCalibratedActionAsset("thinking", baseAsset, {
        offset_x: 25,
        offset_y: -15,
        pivot: { x: 300, y: 480 },
        motion_preset: "wave",
        motion_speed: 1.5,
        motion_intensity: "subtle",
      });

      expect(calibrated.registration.offset_x).toBe(25);
      expect(calibrated.registration.offset_y).toBe(-15);
      expect(calibrated.registration.pivot).toEqual({ x: 300, y: 480 });
      expect(calibrated.motion.preset).toBe("wave");
      expect(calibrated.motion.speed).toBe(1.5);
      expect(calibrated.motion.intensity).toBe("subtle");
    });

    it("calibrates using nested registration_offset and motion objects", () => {
      const baseAsset = {
        version: 2 as const,
        action: "celebrate" as MascotActionType,
        image_url: "https://example.com/celebrate.png",
        registration: {
          source_width: 512,
          source_height: 512,
          content_bounds: { x: 0, y: 0, width: 512, height: 512 },
          pivot: { x: 256, y: 512 },
          offset_x: 0,
          offset_y: 0,
        },
        motion: {
          preset: "jump" as const,
          speed: 1,
          intensity: "normal" as const,
        },
      };

      const calibrated = buildCalibratedActionAsset("celebrate", baseAsset, {
        registration_offset: { offset_x: 50, offset_y: -20 },
        pivot_x: 280,
        pivot_y: 500,
        motion: {
          preset: "pulse",
          speed: 2.2,
          intensity: "dynamic",
        },
      });

      expect(calibrated.registration.offset_x).toBe(50);
      expect(calibrated.registration.offset_y).toBe(-20);
      expect(calibrated.registration.pivot).toEqual({ x: 280, y: 500 });
      expect(calibrated.motion.preset).toBe("pulse");
      expect(calibrated.motion.speed).toBe(2.2);
      expect(calibrated.motion.intensity).toBe("dynamic");
    });
  });

  describe("Repository saveMascot & calibrateMascotAction", () => {
    it("saves mascot with valid render_bundle and calibrates action cleanly", async () => {
      const repo = await createRepositoryFixture();

      // 1. Save new mascot
      const saved = await repo.saveMascot({
        name: "Repository Mascot",
        description: "Testing repository persistence",
        master_image_url: "https://example.com/master.png",
        visual_style: "pixar_3d",
      });

      expect(saved.id).toBeDefined();
      expect(saved.schema_version).toBe(2);
      expect(saved.render_bundle).toBeDefined();
      expect(saved.render_bundle?.assets.master?.image_url).toBe("https://example.com/master.png");

      // 2. Calibrate action
      const calibrated = await repo.calibrateMascotAction(saved.id, "thinking", {
        offset_x: 35,
        offset_y: -10,
        pivot: { x: 220, y: 460 },
        motion_preset: "sway",
        motion_speed: 1.4,
        motion_intensity: "dynamic",
      });

      // Verify returned profile has calibrated render_bundle
      const thinkingAsset = calibrated.render_bundle?.assets.actions.thinking;
      expect(thinkingAsset).toBeDefined();
      expect(thinkingAsset?.registration.offset_x).toBe(35);
      expect(thinkingAsset?.registration.offset_y).toBe(-10);
      expect(thinkingAsset?.registration.pivot).toEqual({ x: 220, y: 460 });
      expect(thinkingAsset?.motion.preset).toBe("sway");
      expect(thinkingAsset?.motion.speed).toBe(1.4);
      expect(thinkingAsset?.motion.intensity).toBe("dynamic");

      // 3. Read fresh from disk to verify atomic persistence
      const reloaded = await repo.getMascot(saved.id);
      expect(reloaded.schema_version).toBe(2);
      const reloadedAsset = reloaded.render_bundle?.assets.actions.thinking;
      expect(reloadedAsset?.registration.offset_x).toBe(35);
      expect(reloadedAsset?.registration.offset_y).toBe(-10);
      expect(reloadedAsset?.registration.pivot).toEqual({ x: 220, y: 460 });
      expect(reloadedAsset?.motion.preset).toBe("sway");

      // 4. Verify disk file content matches
      const diskContent = JSON.parse(await readFile(path.join(repo.roots.mascots, saved.id, "mascot.json"), "utf8")) as MascotProfile;
      expect(diskContent.schema_version).toBe(2);
      expect(diskContent.render_bundle?.assets.actions.thinking?.registration.offset_x).toBe(35);
    });
  });

  describe("mascotMigration with ensureMascotStyles", () => {
    it("migrates a V1 mascot to V2 with both render_bundle and styles persisted", async () => {
      const repo = await createRepositoryFixture();
      const mascotId = "v1_owl";
      const mascotDir = path.join(repo.roots.mascots, mascotId);
      await mkdir(mascotDir, { recursive: true });

      // Write a raw V1 profile without render_bundle or schema_version
      const v1Profile = {
        id: mascotId,
        name: "Vintage Owl",
        description: "Legacy mascot",
        visual_style: "pixar_3d",
        master_prompt: "owl",
        master_image_url: "https://example.com/owl.png",
        color_theme: "#06b6d4",
        actions: {
          thinking: {
            action: "thinking",
            sprite_url: "https://example.com/owl_thinking.png",
            frames_count: 1,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
            motion_preset: "sway",
            motion_speed: 1,
            motion_intensity: "normal",
          },
        },
        assigned_channel_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await writeFile(path.join(mascotDir, "mascot.json"), JSON.stringify(v1Profile, null, 2), "utf8");

      // Run migration
      const report = await migrateMascotStorage(repo, { mode: "apply" });
      expect(report.migrated).toBe(1);

      // Verify migrated file
      const migrated = await repo.getMascot(mascotId);
      expect(migrated.schema_version).toBe(2);
      expect(migrated.render_bundle).toBeDefined();
      expect(migrated.render_bundle?.assets.actions.thinking?.image_url).toBe("https://example.com/owl_thinking.png");
      expect(migrated.styles).toBeDefined();
      expect(migrated.styles?.length).toBeGreaterThanOrEqual(1);
      expect(migrated.active_style_id).toBe("core");
    });
  });
});
