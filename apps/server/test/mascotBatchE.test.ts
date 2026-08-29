import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MascotProfileSchema, QuizV2Schema, adaptMascotV1ToV2, type MascotProfile } from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { renderProductionMascotHtmlLayer } from "../src/quiz/render/productionMascotRenderer.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { migrateMascotStorage, rollbackMascotStorage } from "../src/repository/mascotMigration.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const mascot: MascotProfile = {
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

describe("Batch E portrait and mascot migration", () => {
  it("uses a true 1080x1920 canvas in preview, production mascot HTML, and composition mounts", () => {
    const preview = buildSandboxComposition(
      {
        aspect_ratio: "9:16",
        mascot_id: mascot.id,
        mascot_enabled: true,
        mascot_phase: "thinking",
        mascot_action: "thinking",
        mascot_playing: false,
      },
      mascot,
    ).html;
    expect(preview).toContain('data-width="1080" data-height="1920" data-aspect-ratio="9:16"');
    expect(preview).toContain('data-mascot-canvas="1080x1920"');
    expect(preview).toContain('#stage[data-aspect-ratio="9:16"] .layout-media_left_choices_right .game-stage');

    const production = renderProductionMascotHtmlLayer(
      mascot,
      {
        enabled: true,
        position: "bottom_left",
        scale: 1,
        offset_x: 0,
        offset_y: 0,
        flip_x: false,
        show_in_intro: false,
        show_in_outro: false,
        show_in_question: true,
      },
      {
        aspectRatio: "9:16",
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 4,
      },
    );
    expect(production).toContain('data-mascot-canvas="1080x1920"');

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
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    const bundle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      theme: "candy_arcade",
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      aspectRatio: "9:16",
    });
    expect(bundle.html).toContain('data-width="1080" data-height="1920" data-aspect-ratio="9:16"');
    expect(Object.values(bundle.files).every((file) => file.includes('data-width="1080" data-height="1920"'))).toBe(true);
  });

  it("migrates V1 mascot manifests idempotently with a backup and restores the exact original on rollback", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-batch-e-migration-"));
    roots.push(root);
    const repository = new RepositoryService(root);
    await repository.ensureBootstrap();
    const mascotDir = path.join(repository.roots.mascots, mascot.id);
    await mkdir(path.join(mascotDir, "assets"), { recursive: true });
    const original = `${JSON.stringify(mascot, null, 2)}\n`;
    await writeFile(path.join(mascotDir, "mascot.json"), original, "utf8");

    const dryRun = await migrateMascotStorage(repository, { mode: "dry_run", migration_id: "batch-e-test" });
    expect(dryRun.items).toEqual([{ mascot_id: mascot.id, status: "would_migrate" }]);
    expect(await readFile(path.join(mascotDir, "mascot.json"), "utf8")).toBe(original);

    const applied = await migrateMascotStorage(repository, { mode: "apply", migration_id: "batch-e-test" });
    expect(applied.migrated).toBe(1);
    const migrated = MascotProfileSchema.parse(JSON.parse(await readFile(path.join(mascotDir, "mascot.json"), "utf8")) as unknown);
    expect(migrated.schema_version).toBe(2);
    expect(migrated.render_bundle?.config.version).toBe(2);
    expect(migrated.render_bundle?.assets.actions.thinking?.image_url).toContain("thinking.png");
    const backupPath = path.join(repository.roots.runtime, applied.items[0].backup_path!);
    expect((await stat(backupPath)).isFile()).toBe(true);

    const repeated = await migrateMascotStorage(repository, { mode: "apply", migration_id: "batch-e-test" });
    expect(repeated.migrated).toBe(0);
    expect(repeated.skipped).toBe(1);

    const rolledBack = await rollbackMascotStorage(repository, "batch-e-test");
    expect(rolledBack.migrated).toBe(1);
    expect(await readFile(path.join(mascotDir, "mascot.json"), "utf8")).toBe(original);
    expect(adaptMascotV1ToV2(mascot)?.assets.actions.thinking?.legacy_animation).toBeUndefined();
  });

  it("preserves calibrated V2 assets when a legacy-shaped profile is saved unchanged", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-batch-e-save-"));
    roots.push(root);
    const repository = new RepositoryService(root);
    const bundle = adaptMascotV1ToV2(mascot);
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

    const saved = await repository.saveMascot({ ...mascot, schema_version: 2, render_bundle: calibrated });
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
    expect(updated.render_bundle?.assets.master?.image_url).toBe(mascot.master_image_url);
  });

  it("refuses rollback after the migrated manifest changes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-batch-e-conflict-"));
    roots.push(root);
    const repository = new RepositoryService(root);
    await repository.ensureBootstrap();
    const mascotDir = path.join(repository.roots.mascots, mascot.id);
    await mkdir(path.join(mascotDir, "assets"), { recursive: true });
    await writeFile(path.join(mascotDir, "mascot.json"), `${JSON.stringify(mascot, null, 2)}\n`, "utf8");

    await migrateMascotStorage(repository, { mode: "apply", migration_id: "batch-e-conflict" });
    const migratedPath = path.join(mascotDir, "mascot.json");
    const migrated = JSON.parse(await readFile(migratedPath, "utf8")) as MascotProfile;
    migrated.description = "Changed after migration";
    await writeFile(migratedPath, `${JSON.stringify(migrated, null, 2)}\n`, "utf8");

    const rollback = await rollbackMascotStorage(repository, "batch-e-conflict");
    expect(rollback.items).toEqual([{ mascot_id: mascot.id, status: "conflict", message: "Current V2 manifest changed after migration" }]);
    expect(JSON.parse(await readFile(migratedPath, "utf8"))).toMatchObject({ description: "Changed after migration", schema_version: 2 });
  });
});
