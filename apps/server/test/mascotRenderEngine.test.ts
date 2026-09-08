import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  MascotProfileSchema,
  QuizV2Schema,
  adaptMascotV1ToV2,
  normalizeMascotRenderPhase,
  resolveMascotMotionTransform,
  resolveMascotRenderGeometry,
  resolveMascotRenderSpec,
  type MascotProfile,
  type MascotSpriteAction,
} from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { adaptMascotForQuestion } from "../src/quiz/render/productionMascotRenderer.js";
import { getMascotPreloadUrls } from "../src/quiz/render/mascotStateResolver.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { migrateMascotStorage, rollbackMascotStorage } from "../src/repository/mascotMigration.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function action(actionName: MascotSpriteAction["action"], url: string, overrides: Partial<MascotSpriteAction> = {}): MascotSpriteAction {
  return {
    action: actionName,
    sprite_url: url,
    frames_count: 1,
    fps: 8,
    loop: true,
    frame_width: 512,
    frame_height: 512,
    offset_x: 0,
    offset_y: 0,
    ...overrides,
  };
}

function mascot(actions: MascotProfile["actions"] = {}): MascotProfile {
  return {
    id: "engine-mascot",
    name: "Engine Mascot",
    description: "Core engine fixture",
    visual_style: "pixar_3d",
    master_prompt: "Core engine fixture",
    master_image_url: "/assets/master.png",
    color_theme: "#06b6d4",
    actions,
    assigned_channel_ids: [],
    created_at: "2026-08-29T00:00:00.000Z",
    updated_at: "2026-08-29T00:00:00.000Z",
  };
}

function context(
  phase: "intro" | "question" | "choices" | "thinking" | "reveal" | "explain" | "outro",
  reveal_outcome = null as "correct" | "wrong" | "timeout" | null,
) {
  return { aspect_ratio: "16:9" as const, phase, reveal_outcome, timeline_time_seconds: 2.5, playing: true };
}

describe("Mascot V2 core engine", () => {
  it("adapts V1 placement, action metadata, and both aspect ratios", () => {
    const bundle = adaptMascotV1ToV2(
      mascot({
        thinking: action("thinking", "/assets/thinking.png", { offset_x: 12, offset_y: -8, motion_preset: "sway", motion_speed: 1.4 }),
      }),
      {
        enabled: true,
        position: "bottom_right",
        scale: 1.84,
        offset_x: 21,
        offset_y: 90,
        show_in_intro: true,
        show_in_outro: false,
        show_in_question: true,
      },
    );

    expect(bundle).not.toBeNull();
    expect(bundle?.config.placements["16:9"]).toEqual(bundle?.config.placements["9:16"]);
    expect(bundle?.config.placements["16:9"]).toMatchObject({
      anchor: "bottom_right",
      scale: 1.84,
      offset_x: 21,
      offset_y: 90,
      flip_x: false,
    });
    expect(bundle?.assets.actions.thinking).toMatchObject({
      action: "thinking",
      image_url: "/assets/thinking.png",
      registration: { source_width: 512, source_height: 512, offset_x: 12, offset_y: -8 },
      motion: { preset: "sway", speed: 1.4, intensity: "normal" },
    });
  });

  it("keeps legacy strips explicitly marked and clamps unsafe V1 values", () => {
    const bundle = adaptMascotV1ToV2(
      mascot({
        wave: action("wave", "/assets/wave-strip.png", {
          frames_count: 20,
          frame_width: 1000,
          frame_height: 600,
          fps: 240,
          motion_speed: 99,
          offset_x: 5000,
        }),
      }),
      { scale: 99, offset_y: -5000 },
    );

    expect(bundle?.config.placements["16:9"].scale).toBe(3);
    expect(bundle?.config.placements["16:9"].offset_y).toBe(-1500);
    expect(bundle?.assets.actions.wave?.legacy_animation).toMatchObject({
      frames_count: 8,
      fps: 120,
      frame_width: 1000,
      frame_height: 600,
    });
    expect(bundle?.assets.actions.wave?.registration.source_width).toBe(8000);
    expect(bundle?.assets.actions.wave?.motion.speed).toBe(5);
  });

  it("resolves phase visibility, reveal outcomes, and fallback metadata", () => {
    const bundle = adaptMascotV1ToV2(
      mascot({
        wave: action("wave", "/assets/wave.png", { offset_x: 7, motion_preset: "wave", motion_speed: 1.8, motion_intensity: "dynamic" }),
        thinking: action("thinking", "/assets/thinking.png", { motion_preset: "sway" }),
        oops: action("oops", "/assets/oops.png", { motion_preset: "shake" }),
      }),
      { show_in_intro: false, show_in_outro: true, show_in_question: true },
    );
    if (!bundle) throw new Error("Expected mascot bundle");

    expect(resolveMascotRenderSpec(bundle, context("intro"))).toBeNull();
    expect(resolveMascotRenderSpec(bundle, context("question"))?.asset.action).toBe("thinking");
    expect(resolveMascotRenderSpec(bundle, context("reveal", "correct"))?.asset.action).toBe("wave");
    expect(resolveMascotRenderSpec(bundle, context("reveal", "correct"))?.motion).toMatchObject({
      preset: "wave",
      speed: 1.8,
      intensity: "dynamic",
    });
    expect(resolveMascotRenderSpec(bundle, context("reveal", "wrong"))?.asset.action).toBe("oops");
    expect(resolveMascotRenderSpec(bundle, context("outro"))?.asset.action).toBe("wave");
    expect(resolveMascotRenderSpec(bundle, { ...context("thinking"), action_override: "surprised" })?.asset.action).toBe("oops");
  });

  it("normalizes the legacy explanation phase name", () => {
    expect(normalizeMascotRenderPhase("explanation")).toBe("explain");
    expect(normalizeMascotRenderPhase("question")).toBe("question");
  });

  it("falls back to the master image and honours disabled policy", () => {
    const bundle = adaptMascotV1ToV2(mascot(), { enabled: false, show_in_question: true });
    if (!bundle) throw new Error("Expected mascot bundle");
    expect(resolveMascotRenderSpec(bundle, context("thinking"))).toBeNull();

    const enabledBundle = adaptMascotV1ToV2(mascot(), { enabled: true, show_in_question: true });
    if (!enabledBundle) throw new Error("Expected enabled mascot bundle");
    const spec = resolveMascotRenderSpec(enabledBundle, context("reveal", "timeout"));
    expect(spec?.asset).toMatchObject({ action: "oops", image_url: "/assets/master.png", motion: { preset: "shake" } });
  });

  it("uses canonical scale, anchor, registration, and flip geometry", () => {
    const bundle = adaptMascotV1ToV2(mascot({ thinking: action("thinking", "/assets/thinking.png", { offset_x: 10, offset_y: -4 }) }), {
      position: "bottom_left",
      scale: 2,
      offset_x: 10,
      offset_y: 5,
      show_in_question: true,
    });
    if (!bundle) throw new Error("Expected mascot bundle");
    const spec = resolveMascotRenderSpec(bundle, context("thinking"));
    if (!spec) throw new Error("Expected render spec");

    const geometry = resolveMascotRenderGeometry(spec);
    expect(geometry.box_width).toBeCloseTo(440);
    expect(geometry.box_height).toBeCloseTo(440);
    expect(geometry.pivot_x).toBeCloseTo(120);
    expect(geometry.pivot_y).toBeCloseTo(1085);
    expect(geometry.visible_content.x).toBeCloseTo(-100 + 10);
    expect(geometry.visible_content.y).toBeCloseTo(645 - 4);

    const flipped = resolveMascotRenderGeometry({ ...spec, placement: { ...spec.placement, flip_x: true } });
    expect(flipped.flip_x).toBe(true);
    expect(flipped.box_width).toBeCloseTo(geometry.box_width);
  });

  it("produces deterministic motion with explicit speed and intensity", () => {
    const motion = { preset: "sway" as const, speed: 1.25, intensity: "normal" as const };
    const first = resolveMascotMotionTransform(motion, 0.75);
    const second = resolveMascotMotionTransform(motion, 0.75);
    expect(first).toEqual(second);
    expect(first).not.toEqual({ translate_x: 0, translate_y: 0, scale_x: 1, scale_y: 1, rotate_deg: 0 });
    expect(resolveMascotMotionTransform({ preset: "none", speed: 5, intensity: "dynamic" }, 4)).toEqual({
      translate_x: 0,
      translate_y: 0,
      scale_x: 1,
      scale_y: 1,
      rotate_deg: 0,
    });
    expect(Math.abs(resolveMascotMotionTransform({ ...motion, intensity: "dynamic" }, 0.75).translate_x)).toBeGreaterThan(
      Math.abs(first.translate_x),
    );
  });
});

describe("Mascot portrait canvas and storage migration", () => {
  const batchMascot: MascotProfile = {
    id: "batch-e-mascot",
    name: "Batch E Mascot",
    description: "Portrait parity fixture",
    visual_style: "pixar_3d",
    master_prompt: "",
    master_image_url: "/api/mascots/batch-e-mascot/assets/master.png",
    color_theme: "#06b6d4",
    actions: {
      thinking: {
        action: "thinking",
        sprite_url: "/api/mascots/batch-e-mascot/assets/thinking.png",
        frames_count: 1,
        fps: 8,
        loop: true,
        frame_width: 512,
        frame_height: 512,
        offset_x: 12,
        offset_y: -4,
        motion_preset: "sway",
        motion_speed: 1.2,
        motion_intensity: "normal",
      },
    },
    assigned_channel_ids: [],
    created_at: "2026-08-30T00:00:00.000Z",
    updated_at: "2026-08-30T00:00:00.000Z",
  };

  it("rejects the retired portrait preview path", () => {
    expect(() =>
      buildSandboxComposition(
        {
          aspect_ratio: "9:16",
          layout_id: "portrait_hero_choices",
          mascot_id: batchMascot.id,
          mascot_enabled: true,
          mascot_phase: "thinking",
          mascot_action: "thinking",
          mascot_playing: false,
        },
        batchMascot,
      ),
    ).toThrow();
  });

  it("rejects the retired portrait production composition path", () => {
    const quiz = QuizV2Schema.parse({
      schema_version: 2,
      episode_id: "batch-e-quiz",
      age_band: "7-9",
      language: "English",
      questions: [
        {
          id: "question-01",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "Which ocean is the largest?",
          choices: [
            { id: "choice-a", text: "Pacific" },
            { id: "choice-b", text: "Atlantic" },
            { id: "choice-c", text: "Arctic" },
          ],
          correct_choice_id: "choice-a",
          explanation: "The Pacific is the largest ocean.",
          fun_fact: "",
          source_ids: ["source-1"],
          visual_opportunity: "A bright globe",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ],
    });
    const director = createDefaultDirectorPlan(quiz, "9:16");
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    expect(() =>
      buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        aspectRatio: "9:16",
      }),
    ).toThrow(/layout_aspect_ratio_unsupported/);
  });

  it("rejects retired portrait mascot composition CSS", () => {
    const quiz = QuizV2Schema.parse({
      schema_version: 2,
      episode_id: "batch-e-safe-zone-quiz",
      age_band: "7-9",
      language: "English",
      questions: [
        {
          id: "question-01",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "Which ocean is the largest?",
          choices: [
            { id: "choice-a", text: "Pacific" },
            { id: "choice-b", text: "Atlantic" },
            { id: "choice-c", text: "Arctic" },
          ],
          correct_choice_id: "choice-a",
          explanation: "The Pacific is the largest ocean.",
          fun_fact: "",
          source_ids: ["source-1"],
          visual_opportunity: "A bright globe",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ],
    });
    const director = createDefaultDirectorPlan(quiz, "9:16");
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    expect(() =>
      buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        aspectRatio: "9:16",
      }),
    ).toThrow(/layout_aspect_ratio_unsupported/);
  });

  it("migrates V1 mascot manifests idempotently with a backup and restores the exact original on rollback", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-migration-test-"));
    roots.push(root);
    const repository = new RepositoryService(root);
    await repository.ensureBootstrap();
    const mascotDir = path.join(repository.roots.mascots, batchMascot.id);
    await mkdir(path.join(mascotDir, "assets"), { recursive: true });
    const original = `${JSON.stringify(batchMascot, null, 2)}\n`;
    await writeFile(path.join(mascotDir, "mascot.json"), original, "utf8");

    const dryRun = await migrateMascotStorage(repository, { mode: "dry_run", migration_id: "migration-test" });
    expect(dryRun.items).toEqual([{ mascot_id: batchMascot.id, status: "would_migrate" }]);
    expect(await readFile(path.join(mascotDir, "mascot.json"), "utf8")).toBe(original);

    const applied = await migrateMascotStorage(repository, { mode: "apply", migration_id: "migration-test" });
    expect(applied.migrated).toBe(1);
    const migrated = MascotProfileSchema.parse(JSON.parse(await readFile(path.join(mascotDir, "mascot.json"), "utf8")) as unknown);
    expect(migrated.schema_version).toBe(2);
    expect(migrated.render_bundle?.config.version).toBe(2);
    expect(migrated.render_bundle?.assets.actions.thinking?.image_url).toContain("thinking.png");
    const backupPath = path.join(repository.roots.runtime, applied.items[0].backup_path!);
    expect((await stat(backupPath)).isFile()).toBe(true);

    const repeated = await migrateMascotStorage(repository, { mode: "apply", migration_id: "migration-test" });
    expect(repeated.migrated).toBe(0);
    expect(repeated.skipped).toBe(1);

    const rolledBack = await rollbackMascotStorage(repository, "migration-test");
    expect(rolledBack.migrated).toBe(1);
    expect(await readFile(path.join(mascotDir, "mascot.json"), "utf8")).toBe(original);
    expect(adaptMascotV1ToV2(batchMascot)?.assets.actions.thinking?.legacy_animation).toBeUndefined();
  });

  it("preserves calibrated V2 assets when a legacy-shaped profile is saved unchanged", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-save-test-"));
    roots.push(root);
    const repository = new RepositoryService(root);
    const bundle = adaptMascotV1ToV2(batchMascot);
    if (!bundle?.assets.actions.thinking) throw new Error("Expected thinking asset");
    const calibrated = {
      ...bundle,
      assets: {
        ...bundle.assets,
        actions: {
          ...bundle.assets.actions,
          thinking: {
            ...bundle.assets.actions.thinking,
            registration: {
              ...bundle.assets.actions.thinking.registration,
              pivot: { x: 173, y: 491 },
            },
            motion: { ...bundle.assets.actions.thinking.motion, speed: 2.4 },
          },
        },
      },
    };

    const saved = await repository.saveMascot({ ...batchMascot, schema_version: 2, render_bundle: calibrated });
    const updated = await repository.saveMascot({
      ...saved,
      name: "Batch E Mascot Updated",
      actions: {
        ...saved.actions,
        thinking: { ...saved.actions.thinking!, preview_url: "/preview.png" },
      },
    });

    expect(updated.render_bundle?.assets.actions.thinking?.registration.pivot).toEqual({ x: 173, y: 491 });
    expect(updated.render_bundle?.assets.actions.thinking?.motion.speed).toBe(2.4);
    expect(updated.render_bundle?.assets.master?.image_url).toBe(batchMascot.master_image_url);
  });

  it("refuses rollback after the migrated manifest changes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-conflict-test-"));
    roots.push(root);
    const repository = new RepositoryService(root);
    await repository.ensureBootstrap();
    const mascotDir = path.join(repository.roots.mascots, batchMascot.id);
    await mkdir(path.join(mascotDir, "assets"), { recursive: true });
    await writeFile(path.join(mascotDir, "mascot.json"), `${JSON.stringify(batchMascot, null, 2)}\n`, "utf8");

    await migrateMascotStorage(repository, { mode: "apply", migration_id: "conflict-test" });
    const migratedPath = path.join(mascotDir, "mascot.json");
    const migrated = JSON.parse(await readFile(migratedPath, "utf8")) as MascotProfile;
    migrated.description = "Changed after migration";
    await writeFile(migratedPath, `${JSON.stringify(migrated, null, 2)}\n`, "utf8");

    const rollback = await rollbackMascotStorage(repository, "conflict-test");
    expect(rollback.items).toEqual([
      { mascot_id: batchMascot.id, status: "conflict", message: "Current V2 manifest changed after migration" },
    ]);
    expect(JSON.parse(await readFile(migratedPath, "utf8"))).toMatchObject({ description: "Changed after migration", schema_version: 2 });
  });
});

describe("Mascot Style Anchor Graceful Fallback (Step 5)", () => {
  it("adapts thinking and celebrate actions to style.anchor_image_url when style has 0 slot variants", () => {
    const mascotWithAnchor: MascotProfile = {
      id: "anchor-mascot",
      name: "Anchor Mascot",
      description: "Anchor fallback fixture",
      visual_style: "pixar_3d",
      master_prompt: "Core mascot",
      master_image_url: "/assets/master.png",
      color_theme: "#06b6d4",
      actions: {
        thinking: action("thinking", "/assets/core-thinking.png"),
        celebrate: action("celebrate", "/assets/core-celebrate.png"),
      },
      styles: [
        {
          id: "cyberpunk-anchor",
          name: "Cyberpunk Anchor",
          keyword: "cyberpunk",
          anchor_image_url: "/assets/cyberpunk-anchor.png",
          is_default: false,
          states: {
            thinking: [],
            celebrate: [],
          },
          created_at: "2026-09-06T00:00:00.000Z",
          updated_at: "2026-09-06T00:00:00.000Z",
        },
      ],
      assigned_channel_ids: [],
      created_at: "2026-09-06T00:00:00.000Z",
      updated_at: "2026-09-06T00:00:00.000Z",
    };

    const adapted = adaptMascotForQuestion(mascotWithAnchor, "cyberpunk-anchor", 0);
    expect(adapted).toBeDefined();
    const thinking = adapted!.actions.thinking;
    expect(thinking?.sprite_url).toBe("/assets/cyberpunk-anchor.png");
    expect(thinking?.motion_preset).toBe("sway");
    expect(thinking?.motion_speed).toBe(1.0);
    expect(thinking?.motion_intensity).toBe("normal");

    const celebrate = adapted!.actions.celebrate;
    expect(celebrate?.sprite_url).toBe("/assets/cyberpunk-anchor.png");
    expect(celebrate?.motion_preset).toBe("jump");
    expect(celebrate?.motion_speed).toBe(1.0);
    expect(celebrate?.motion_intensity).toBe("normal");

    // Also verify render_bundle adaptation when render_bundle is present
    const bundleMascot: MascotProfile = {
      ...mascotWithAnchor,
      render_bundle: adaptMascotV1ToV2(mascotWithAnchor, { enabled: true })!,
    };
    const adaptedBundle = adaptMascotForQuestion(bundleMascot, "cyberpunk-anchor", 0);
    const bundleActions = adaptedBundle?.render_bundle?.assets.actions;
    expect(bundleActions?.thinking?.image_url).toBe("/assets/cyberpunk-anchor.png");
    expect(bundleActions?.thinking?.motion?.preset).toBe("sway");
    expect(bundleActions?.celebrate?.image_url).toBe("/assets/cyberpunk-anchor.png");
    expect(bundleActions?.celebrate?.motion?.preset).toBe("jump");
  });

  it("prioritizes slot variants over anchor_image_url when both are present", () => {
    const mascotWithBoth: MascotProfile = {
      id: "both-mascot",
      name: "Both Mascot",
      description: "Precedence fixture",
      visual_style: "pixar_3d",
      master_prompt: "Core mascot",
      master_image_url: "/assets/master.png",
      color_theme: "#06b6d4",
      actions: {},
      styles: [
        {
          id: "style-with-both",
          name: "Detailed Style",
          keyword: "detailed",
          anchor_image_url: "/assets/anchor-should-be-ignored.png",
          is_default: false,
          states: {
            thinking: [{ id: "t0", slot_index: 1, image_url: "/assets/slot-thinking.png", motion_preset: "sway" }],
            celebrate: [{ id: "c0", slot_index: 1, image_url: "/assets/slot-celebrate.png", motion_preset: "jump" }],
          },
          created_at: "2026-09-06T00:00:00.000Z",
          updated_at: "2026-09-06T00:00:00.000Z",
        },
      ],
      assigned_channel_ids: [],
      created_at: "2026-09-06T00:00:00.000Z",
      updated_at: "2026-09-06T00:00:00.000Z",
    };

    const adapted = adaptMascotForQuestion(mascotWithBoth, "style-with-both", 0);
    expect(adapted?.actions.thinking?.sprite_url).toBe("/assets/slot-thinking.png");
    expect(adapted?.actions.celebrate?.sprite_url).toBe("/assets/slot-celebrate.png");
  });

  it("includes all style anchor URLs in getMascotPreloadUrls", () => {
    const mascotWithStyles: MascotProfile = {
      id: "preload-mascot",
      name: "Preload Mascot",
      description: "Preload test",
      visual_style: "pixar_3d",
      master_prompt: "Core",
      master_image_url: "/assets/master.png",
      color_theme: "#06b6d4",
      actions: {
        thinking: action("thinking", "/assets/core-thinking.png"),
      },
      styles: [
        {
          id: "style-1",
          name: "Style 1",
          keyword: "s1",
          anchor_image_url: "/assets/style-1-anchor.png",
          is_default: false,
          states: { thinking: [], celebrate: [] },
          created_at: "2026-09-06T00:00:00.000Z",
          updated_at: "2026-09-06T00:00:00.000Z",
        },
        {
          id: "style-2",
          name: "Style 2",
          keyword: "s2",
          anchor_image_url: "/assets/style-2-anchor.png",
          is_default: false,
          states: {
            thinking: [{ id: "t0", slot_index: 1, image_url: "/assets/style-2-thinking.png" }],
            celebrate: [],
          },
          created_at: "2026-09-06T00:00:00.000Z",
          updated_at: "2026-09-06T00:00:00.000Z",
        },
        {
          id: "style-3",
          name: "Style 3 Without Anchor",
          keyword: "s3",
          anchor_image_url: null,
          is_default: false,
          states: { thinking: [], celebrate: [] },
          created_at: "2026-09-06T00:00:00.000Z",
          updated_at: "2026-09-06T00:00:00.000Z",
        },
      ],
      assigned_channel_ids: [],
      created_at: "2026-09-06T00:00:00.000Z",
      updated_at: "2026-09-06T00:00:00.000Z",
    };

    const urls = getMascotPreloadUrls(mascotWithStyles);
    expect(urls).toContain("/assets/master.png");
    expect(urls).toContain("/assets/core-thinking.png");
    expect(urls).toContain("/assets/style-1-anchor.png");
    expect(urls).toContain("/assets/style-2-anchor.png");
    expect(urls).toContain("/assets/style-2-thinking.png");
  });

  it("renders style anchor fallback in candy arcade composition when mascot_style_id has 0 slot variants", () => {
    const quiz = QuizV2Schema.parse({
      schema_version: 2,
      episode_id: "anchor-composition-quiz",
      age_band: "7-9",
      language: "English",
      quiz_config: {
        mascot_style_id: "cyberpunk-anchor",
      },
      questions: [
        {
          id: "q-01",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "First test question?",
          choices: [
            { id: "c1", text: "Answer 1" },
            { id: "c2", text: "Answer 2" },
            { id: "c3", text: "Answer 3" },
          ],
          correct_choice_id: "c1",
          explanation: "Explanation 1",
          fun_fact: "",
          source_ids: ["S1"],
          visual_opportunity: "Scene 1",
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        },
      ],
    });

    const mascotWithAnchor: MascotProfile = {
      id: "anchor-quiz-mascot",
      name: "Anchor Quiz Mascot",
      description: "Test",
      visual_style: "pixar_3d",
      master_prompt: "Core",
      master_image_url: "/assets/master.png",
      color_theme: "#06b6d4",
      actions: {},
      styles: [
        {
          id: "cyberpunk-anchor",
          name: "Cyberpunk Anchor",
          keyword: "cyberpunk",
          anchor_image_url: "/assets/cyberpunk-anchor.png",
          is_default: false,
          states: { thinking: [], celebrate: [] },
          created_at: "2026-09-06T00:00:00.000Z",
          updated_at: "2026-09-06T00:00:00.000Z",
        },
      ],
      assigned_channel_ids: [],
      created_at: "2026-09-06T00:00:00.000Z",
      updated_at: "2026-09-06T00:00:00.000Z",
    };

    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    const bundle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: mascotWithAnchor,
      mascotConfig: { enabled: true, show_in_question: true, show_in_intro: true, show_in_outro: true },
    });

    expect(bundle.html).toContain("cyberpunk-anchor.png");
    expect(bundle.html).toContain('rel="preload"');

    const introScene = bundle.files["compositions/candy-intro.html"];
    expect(introScene).toContain("/assets/cyberpunk-anchor.png");

    const questionClipEntry = Object.entries(bundle.files).find(([k]) => k.includes("quiz-q1-"));
    expect(questionClipEntry).toBeDefined();
    expect(questionClipEntry![1]).toContain("/assets/cyberpunk-anchor.png");
  });
});
