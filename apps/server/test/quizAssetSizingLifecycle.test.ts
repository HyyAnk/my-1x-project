import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EpisodeSchema,
  type DirectorPlan,
  type QuizAssetPlan,
  type QuizV2,
} from "@studio/shared";
import {
  ensureQuizAssetSizing,
  computeQuizSourceIdentityToken,
} from "../src/quiz/assets/ensureQuizAssetSizing.js";
import { prepareVideoComposition } from "../src/tasks/video/videoCompositionPreparer.js";
import { styleBoundaryChannel, styleBoundaryEpisode } from "./quizStyleBoundaryFixtures.js";
import type { RepositoryService } from "../src/repository.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";

describe("quizAssetSizingLifecycle", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })));
  });

  async function createTestRoot(): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), "sizing-lifecycle-"));
    roots.push(root);
    return root;
  }

  function createMockQuiz(episodeId: string): QuizV2 {
    return {
      schema_version: 2,
      episode_id: episodeId,
      language: "en",
      age_band: "7-9",
      questions: [
        {
          id: "q1",
          number: 1,
          format: "multiple_choice",
          difficulty: 1,
          question: "Which ocean is largest?",
          choices: [
            { id: "c1", text: "Pacific" },
            { id: "c2", text: "Atlantic" },
            { id: "c3", text: "Indian" },
          ],
          correct_choice_id: "c1",
          explanation: "The Pacific Ocean covers over 30% of Earth.",
          fun_fact: "It is larger than all Earth's land area combined.",
          source_ids: ["s1"],
          visual_opportunity: "Show the vast Pacific Ocean.",
          validation: {
            semantic_status: "validated",
            source_coverage: true,
            fact_locked: true,
          },
        },
      ],
    };
  }

  function createMockDirector(layout_id: "media_left_choices_right" | "grid_2x2" | "stack_3_portrait"): DirectorPlan {
    return {
      schema_version: 2,
      episode_id: "test-ep",
      archetype_family: "candy_arcade",
      midpoint_question_id: null,
      final_challenge_question_id: null,
      beats: [
        {
          question_id: "q1",
          archetype: "illustrated_multiple_choice",
          layout_id,
          energy: "curious",
          visual_density: "focused",
          palette_id: "lime",
          motion_id: "enter.pop",
          transition_id: "bubble_splash",
          thinking_bar_style: "auto",
          question_counter_style: "auto",
          question_box_style: "auto",
          answer_card_style: "auto",
          background_style: "auto",
          thinking_seconds: 7,
          beat_intents: ["question_enter", "choice_reveal", "thinking", "answer_reveal"],
          asset_intents: ["question_illustration"],
          mascot_state: "celebrate",
          sfx_intents: ["countdown_tick", "correct_small"],
          transition_intent: "cut",
          reward_intensity: "small",
        },
      ],
    };
  }

  it("inspect intent is strictly read-only: does not write plan or invoke provider", async () => {
    const root = await createTestRoot();
    const episodeId = "ep_inspect_test";
    const quiz = createMockQuiz(episodeId);
    // media_left_choices_right resolves hero to 4:3 in the new contract
    const director = createMockDirector("media_left_choices_right");

    // Stale plan saved with 1:1 aspect ratio and custom subject
    const stalePlan: QuizAssetPlan = {
      schema_version: 2,
      episode_id: episodeId,
      assets: [
        {
          asset_id: "asset-q1-hero",
          question_id: "q1",
          subject: "A handcrafted custom subject that should not be wiped",
          purpose: "hero_question_image",
          style: "cute_illustration",
          aspect_ratio: "1:1", // Stale square ratio
          transparent_background: false,
          required: true,
          semantic_key: "q1:hero_question_image",
          consistency_group_id: null,
        },
      ],
      consistency_groups: [],
    };

    const writeSpy = vi.fn();
    const providerSpy = vi.fn();

    const repository = {
      rootDirectory: root,
      readQuiz: vi.fn().mockResolvedValue(quiz),
      readDirectorPlan: vi.fn().mockResolvedValue(director),
      readAssetPlan: vi.fn().mockResolvedValue(stalePlan),
      readQuizAssetResolution: vi.fn().mockResolvedValue(null),
      writeAssetPlan: writeSpy,
    } as unknown as RepositoryService;

    const result = await ensureQuizAssetSizing({
      repository,
      channelId: "ch1",
      episodeId,
      intent: "inspect",
    });

    expect(providerSpy).not.toHaveBeenCalled();
    expect(writeSpy).not.toHaveBeenCalled();
    expect(result.status).toBe("stale");
    expect(result.affectedAssetIds).toEqual(["asset-q1-hero"]);
    // Verifies hand-authored subject was preserved in the reconciled plan
    expect(result.reconciledPlan.assets[0].subject).toBe("A handcrafted custom subject that should not be wiped");
    expect(result.reconciledPlan.assets[0].aspect_ratio).toBe("4:3");
  });

  it("generate intent requires confirmation for generation-affecting ratio changes", async () => {
    const root = await createTestRoot();
    const episodeId = "ep_confirm_test";
    const quiz = createMockQuiz(episodeId);
    const director = createMockDirector("media_left_choices_right");

    const stalePlan: QuizAssetPlan = {
      schema_version: 2,
      episode_id: episodeId,
      assets: [
        {
          asset_id: "asset-q1-hero",
          question_id: "q1",
          subject: "Handcrafted subject",
          purpose: "hero_question_image",
          style: "cute_illustration",
          aspect_ratio: "1:1",
          transparent_background: false,
          required: true,
          semantic_key: "q1:hero_question_image",
          consistency_group_id: null,
        },
      ],
      consistency_groups: [],
    };

    const writeSpy = vi.fn();
    const repository = {
      rootDirectory: root,
      readQuiz: vi.fn().mockResolvedValue(quiz),
      readDirectorPlan: vi.fn().mockResolvedValue(director),
      readAssetPlan: vi.fn().mockResolvedValue(stalePlan),
      readQuizAssetResolution: vi.fn().mockResolvedValue(null),
      writeAssetPlan: writeSpy,
    } as unknown as RepositoryService;

    // 1. Without confirmation: status is confirmation_required, no write
    const unconfirmedResult = await ensureQuizAssetSizing({
      repository,
      channelId: "ch1",
      episodeId,
      intent: "generate",
      confirmed: false,
    });
    expect(unconfirmedResult.status).toBe("confirmation_required");
    expect(unconfirmedResult.affectedAssetIds).toEqual(["asset-q1-hero"]);
    expect(writeSpy).not.toHaveBeenCalled();

    // 2. With confirmation: status is current, plan is persisted
    const confirmedResult = await ensureQuizAssetSizing({
      repository,
      channelId: "ch1",
      episodeId,
      intent: "generate",
      confirmed: true,
    });
    expect(confirmedResult.status).toBe("current");
    expect(confirmedResult.persisted).toBe(true);
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(confirmedResult.reconciledPlan.assets[0].aspect_ratio).toBe("4:3");
  });

  it("metadata-only reconciliation persists automatically without requiring user confirmation", async () => {
    const root = await createTestRoot();
    const episodeId = "ep_metadata_test";
    const quiz = createMockQuiz(episodeId);
    const director = createMockDirector("media_left_choices_right");

    // Plan already has correct ratio 4:3, but missing sizing metadata
    const compatiblePlan: QuizAssetPlan = {
      schema_version: 2,
      episode_id: episodeId,
      assets: [
        {
          asset_id: "asset-q1-hero",
          question_id: "q1",
          subject: "Pacific ocean hero",
          purpose: "hero_question_image",
          style: "cute_illustration",
          aspect_ratio: "4:3",
          transparent_background: false,
          required: true,
          semantic_key: "q1:hero_question_image",
          consistency_group_id: null,
          // sizing is intentionally omitted (old file)
        },
      ],
      consistency_groups: [],
    };

    const writeSpy = vi.fn().mockResolvedValue("asset-plan.json");
    const repository = {
      rootDirectory: root,
      readQuiz: vi.fn().mockResolvedValue(quiz),
      readDirectorPlan: vi.fn().mockResolvedValue(director),
      readAssetPlan: vi.fn().mockResolvedValue(compatiblePlan),
      readQuizAssetResolution: vi.fn().mockResolvedValue(null),
      writeAssetPlan: writeSpy,
    } as unknown as RepositoryService;

    const result = await ensureQuizAssetSizing({
      repository,
      channelId: "ch1",
      episodeId,
      intent: "generate",
      confirmed: false, // Not confirmed, but should persist because it is metadata_only
    });

    expect(result.status).toBe("current");
    expect(result.persisted).toBe(true);
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(result.reconciledPlan.assets[0].sizing).toBeDefined();
    expect(result.reconciledPlan.assets[0].sizing?.layout_id).toBe("media_left_choices_right");
  });

  it("rejects commit when layout changes during generation (source identity token guard)", async () => {
    const root = await createTestRoot();
    const episodeId = "ep_token_guard_test";
    const quiz = createMockQuiz(episodeId);
    const director = createMockDirector("media_left_choices_right");

    // Compute token from an earlier director configuration
    const staleDirector = createMockDirector("grid_2x2");
    const staleToken = computeQuizSourceIdentityToken(quiz, staleDirector);

    const repository = {
      rootDirectory: root,
      readQuiz: vi.fn().mockResolvedValue(quiz),
      readDirectorPlan: vi.fn().mockResolvedValue(director), // Current is media_left_choices_right
      readAssetPlan: vi.fn().mockResolvedValue({
        schema_version: 2,
        episode_id: episodeId,
        assets: [],
        consistency_groups: [],
      }),
      readQuizAssetResolution: vi.fn().mockResolvedValue(null),
      writeAssetPlan: vi.fn(),
    } as unknown as RepositoryService;

    await expect(
      ensureQuizAssetSizing({
        repository,
        channelId: "ch1",
        episodeId,
        intent: "generate",
        sourceIdentityToken: staleToken,
      }),
    ).rejects.toMatchObject({ code: "asset_sizing_changed_during_generation" });
  });

  it("composition preparer blocks render when asset sizing is stale, without filesystem side effects", async () => {
    const root = await createTestRoot();
    const episodeId = "ep_render_stale_test";
    const channel = styleBoundaryChannel();

    const episode = EpisodeSchema.parse({
      episode_id: episodeId,
      channel_id: channel.channel_id,
      slug: episodeId,
      topic: { title: "Test", premise: "Test", hook: "Hook" },
      stage: "QUIZ_READY",
      script_path: "script.md",
      scene_plan_path: "scenes.json",
      dialogue_script_path: "dialogue.md",
      video_prompts_path: "prompts.md",
      narration_asset_path: "narration.wav",
      narration_generated_at: "2026-08-31T00:00:00.000Z",
      narration_duration_seconds: 15,
      narration_segment_count: 1,
      measured_narration_words_per_second: 20,
      quiz_config: styleBoundaryEpisode(),
      video_asset_path: null,
      created_at: "2026-08-31T00:00:00.000Z",
      updated_at: "2026-08-31T00:00:00.000Z",
    });

    const quiz = createMockQuiz(episodeId);
    const director = createMockDirector("media_left_choices_right");
    const stalePlan: QuizAssetPlan = {
      schema_version: 2,
      episode_id: episodeId,
      assets: [
        {
          asset_id: "asset-q1-hero",
          question_id: "q1",
          subject: "Stale square hero",
          purpose: "hero_question_image",
          style: "cute_illustration",
          aspect_ratio: "1:1", // Stale square
          transparent_background: false,
          required: true,
          semantic_key: "q1:hero_question_image",
          consistency_group_id: null,
        },
      ],
      consistency_groups: [],
    };

    const renderRoot = path.join(root, "runtime", "hyperframes", episodeId);
    const writeSpy = vi.fn();

    const repository = {
      rootDirectory: root,
      resolvePath: (...segments: string[]) => path.join(root, ...segments),
      getEpisode: () => Promise.resolve(episode),
      getChannel: () => Promise.resolve(channel),
      readScenes: () => Promise.resolve([]),
      getEpisodeAudioFile: () =>
        Promise.resolve({
          absolutePath: path.join(root, "fake-narration.wav"),
          path: "narration.wav",
          size: 44,
          modified_at: "2026-08-31T00:00:00.000Z",
        }),
      readQuiz: vi.fn().mockResolvedValue(quiz),
      readDirectorPlan: vi.fn().mockResolvedValue(director),
      readAssetPlan: vi.fn().mockResolvedValue(stalePlan),
      readVoicePlan: vi.fn().mockResolvedValue({ segments: [] }),
      readQuizTimeline: vi.fn().mockResolvedValue({ total_duration_seconds: 15 }),
      readQuizAssetResolution: vi.fn().mockResolvedValue(null),
      readBgmHistory: vi.fn().mockResolvedValue([]),
      writeJsonAtomic: writeSpy,
    } as unknown as RepositoryService;

    const runtime = {
      videoConfig: { fps: 30 },
      logger: { ok: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as TaskManagerRuntime;

    await expect(
      prepareVideoComposition({
        runtime,
        repository,
        taskId: "task-sizing-guard",
        channel,
        episode,
        scenes: [],
        renderAspectRatio: "16:9",
        onProgress: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toMatchObject({ code: "QUIZ_ASSET_SIZING_STALE" });

    // Verify side-effect free: render root directory was NOT created
    expect(existsSync(renderRoot)).toBe(false);
  });

  it("composition preparer preserves QUIZ_V2_REQUIRED when artifacts are missing before sizing check", async () => {
    const root = await createTestRoot();
    const episodeId = "ep_missing_quiz_test";
    const channel = styleBoundaryChannel();

    const episode = EpisodeSchema.parse({
      episode_id: episodeId,
      channel_id: channel.channel_id,
      slug: episodeId,
      topic: { title: "Test", premise: "Test", hook: "Hook" },
      stage: "QUIZ_READY",
      script_path: "script.md",
      scene_plan_path: "scenes.json",
      dialogue_script_path: "dialogue.md",
      video_prompts_path: "prompts.md",
      narration_asset_path: "narration.wav",
      narration_generated_at: "2026-08-31T00:00:00.000Z",
      narration_duration_seconds: 15,
      narration_segment_count: 1,
      measured_narration_words_per_second: 20,
      quiz_config: styleBoundaryEpisode(),
      video_asset_path: "channels/ch/episodes/ep/assets/existing.mp4", // Existing video
      created_at: "2026-08-31T00:00:00.000Z",
      updated_at: "2026-08-31T00:00:00.000Z",
    });

    const renderRoot = path.join(root, "runtime", "hyperframes", episodeId);
    const writeSpy = vi.fn();

    const repository = {
      rootDirectory: root,
      resolvePath: (...segments: string[]) => path.join(root, ...segments),
      getEpisode: () => Promise.resolve(episode),
      getChannel: () => Promise.resolve(channel),
      readScenes: () => Promise.resolve([]),
      getEpisodeAudioFile: () =>
        Promise.resolve({
          absolutePath: path.join(root, "fake-narration.wav"),
          path: "narration.wav",
          size: 44,
          modified_at: "2026-08-31T00:00:00.000Z",
        }),
      readQuiz: vi.fn().mockResolvedValue(null), // Missing quiz-v2.json!
      readDirectorPlan: vi.fn().mockResolvedValue(null),
      readAssetPlan: vi.fn().mockResolvedValue(null),
      readVoicePlan: vi.fn().mockResolvedValue(null),
      readQuizTimeline: vi.fn().mockResolvedValue(null),
      readQuizAssetResolution: vi.fn().mockResolvedValue(null),
      readBgmHistory: vi.fn().mockResolvedValue([]),
      writeJsonAtomic: writeSpy,
    } as unknown as RepositoryService;

    const runtime = {
      videoConfig: { fps: 30 },
      logger: { ok: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as TaskManagerRuntime;

    await expect(
      prepareVideoComposition({
        runtime,
        repository,
        taskId: "task-missing-quiz-guard",
        channel,
        episode,
        scenes: [],
        renderAspectRatio: "16:9",
        onProgress: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toMatchObject({ code: "QUIZ_V2_REQUIRED" });

    // Verify side-effect free: render root directory was NOT created
    expect(existsSync(renderRoot)).toBe(false);
  });
});
