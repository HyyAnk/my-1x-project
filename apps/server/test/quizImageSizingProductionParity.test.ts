import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChannelSchema,
  EpisodeSchema,
  QuizAssetPlanSchema,
  QuizAssetResolutionSchema,
  QuizV2Schema,
  type DirectorPlan,
  type QuizAssetPlan,
  type QuizAssetResolution,
  type QuizV2,
} from "@studio/shared";
import { RepositoryService } from "../src/repository.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { prepareVideoComposition } from "../src/tasks/video/videoCompositionPreparer.js";
import { executeHyperframesRender } from "../src/tasks/video/videoRenderExecution.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })));
});

async function createTestRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "sizing-parity-render-"));
  roots.push(root);
  const projectRoot = path.resolve(__dirname, "../../..");
  await mkdir(path.join(root, "templates"), { recursive: true });
  await mkdir(path.join(root, "assets"), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8"),
    writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8"),
    cp(path.join(projectRoot, "assets", "fonts"), path.join(root, "assets", "fonts"), { recursive: true }),
  ]);
  return root;
}

function fakeWav(seconds = 6): Uint8Array {
  const sampleRate = 8_000;
  const dataSize = sampleRate * seconds * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) =>
    [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  return new Uint8Array(buffer);
}

/**
 * Generates local diagnostic fixture images with circle distortion cues,
 * grid lines, corner markers, and dimensional labels.
 */
async function generateDiagnosticImage(
  width: number,
  height: number,
  label: string,
  bgColor = "#1e293b",
): Promise<Buffer> {
  const radius = Math.min(width, height) * 0.28;
  const cx = width / 2;
  const cy = height / 2;
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${bgColor}" />
      <!-- Grid pattern -->
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grid)" />
      <!-- Edge crosshairs -->
      <line x1="20" y1="20" x2="60" y2="20" stroke="#f59e0b" stroke-width="4" />
      <line x1="20" y1="20" x2="20" y2="60" stroke="#f59e0b" stroke-width="4" />
      <line x1="${width - 20}" y1="20" x2="${width - 60}" y2="20" stroke="#f59e0b" stroke-width="4" />
      <line x1="${width - 20}" y1="20" x2="${width - 20}" y2="60" stroke="#f59e0b" stroke-width="4" />
      <line x1="20" y1="${height - 20}" x2="60" y2="${height - 20}" stroke="#f59e0b" stroke-width="4" />
      <line x1="20" y1="${height - 20}" x2="20" y2="${height - 60}" stroke="#f59e0b" stroke-width="4" />
      <!-- Center Circle Distortion Cue (must remain circular, not elliptical) -->
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#3b82f6" fill-opacity="0.4" stroke="#60a5fa" stroke-width="6" />
      <circle cx="${cx}" cy="${cy}" r="12" fill="#ef4444" />
      <!-- Label -->
      <text x="${cx}" y="${cy - 30}" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">${label}</text>
      <text x="${cx}" y="${cy + 50}" font-family="sans-serif" font-size="24" fill="#cbd5e1" text-anchor="middle">${width} x ${height}</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe("quizImageSizingProductionParity", () => {
  it("P8B-BND-02: integrates layout-driven sizing through prepareQuizVideoRender into real HyperFrames MP4", async () => {
    const root = await createTestRoot();
    const repository = new RepositoryService(root);
    await repository.ensureBootstrap();

    const channelId = "ch_parity_test";
    const episodeId = "ep_parity_test";

    // 1. Create Channel
    const channel = ChannelSchema.parse({
      channel_id: channelId,
      slug: channelId,
      display_name: "Quiz Parity Channel",
      channel_dna_path: `channels/${channelId}/channel_dna.md`,
      status: "ACTIVE",
      created_at: "2026-08-31T00:00:00.000Z",
      updated_at: "2026-08-31T00:00:00.000Z",
      default_palette_id: "purple",
      default_thinking_bar_style: "star_slider",
      default_question_box_style: "candy_pop",
      default_answer_card_style: "comic_chunky",
      default_counter_style: "golden_shield",
      default_background_style: "candy_rays",
    });
    const channelDir = path.join(root, "channels", channelId);
    await mkdir(channelDir, { recursive: true });
    await writeFile(path.join(channelDir, "channel.json"), JSON.stringify(channel, null, 2), "utf8");
    repository.channelCache.set(channel);
    repository.entityIdResolver.setChannelSlug(channelId, channelId);

    // 2. Multi-layout Quiz:
    // Q1: visual_choices_three (Visual Card) -> 4:3 choices
    // Q2: split_versus_two (Split Versus) -> 16:9 choices
    // Q3: media_left_choices_right (Media Left) -> 4:3 hero
    const quiz = QuizV2Schema.parse({
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
          question: "Which of these sea creatures has three hearts?",
          choices: [
            { id: "c1", text: "Octopus" },
            { id: "c2", text: "Squid" },
            { id: "c3", text: "Jellyfish" },
          ],
          correct_choice_id: "c1",
          explanation: "An octopus has three hearts! Two pump blood to the gills, while the third pumps it to the rest of the body.",
          fun_fact: "Octopus blood is blue because it contains hemocyanin.",
          source_ids: ["marine-bio-1"],
          visual_opportunity: "Show sea creatures swimming underwater.",
          validation: {
            semantic_status: "validated",
            source_coverage: true,
            fact_locked: true,
          },
        },
        {
          id: "q2",
          number: 2,
          format: "true_false",
          difficulty: 2,
          question: "Can space rockets travel faster than jet fighters?",
          choices: [
            { id: "c1", text: "Space Rocket" },
            { id: "c2", text: "Jet Fighter" },
          ],
          correct_choice_id: "c1",
          explanation: "Space rockets travel at orbital velocity, which is over 17,500 miles per hour!",
          fun_fact: "Rockets need immense speed to escape Earth's gravity.",
          source_ids: ["aerospace-1"],
          visual_opportunity: "Compare rocket vs jet in high-speed flight.",
          validation: {
            semantic_status: "validated",
            source_coverage: true,
            fact_locked: true,
          },
        },
        {
          id: "q3",
          number: 3,
          format: "multiple_choice",
          difficulty: 1,
          question: "Which planet is known as the Red Planet?",
          choices: [
            { id: "c1", text: "Mars" },
            { id: "c2", text: "Venus" },
            { id: "c3", text: "Jupiter" },
          ],
          correct_choice_id: "c1",
          explanation: "Mars appears reddish because of iron oxide (rust) on its dusty surface.",
          fun_fact: "Mars is home to Olympus Mons, the largest volcano in the Solar System.",
          source_ids: ["astronomy-1"],
          visual_opportunity: "Vibrant view of Mars glowing in dark space.",
          validation: {
            semantic_status: "validated",
            source_coverage: true,
            fact_locked: true,
          },
        },
      ],
    });

    const director: DirectorPlan = {
      schema_version: 2,
      episode_id: episodeId,
      archetype_family: "candy_arcade",
      midpoint_question_id: null,
      final_challenge_question_id: "q3",
      beats: [
        {
          question_id: "q1",
          archetype: "visual_multiple_choice",
          layout_id: "visual_choices_three",
          energy: "curious",
          visual_density: "focused",
          palette_id: "purple",
          motion_id: "enter.pop",
          transition_id: "bubble_splash",
          thinking_bar_style: "star_slider",
          question_counter_style: "golden_shield",
          question_box_style: "candy_pop",
          answer_card_style: "comic_chunky",
          background_style: "candy_rays",
          thinking_seconds: 7,
          beat_intents: ["question_enter", "choice_reveal", "thinking", "answer_reveal"],
          asset_intents: ["choice_illustration"],
          mascot_state: "idle",
          sfx_intents: ["countdown_tick"],
          transition_intent: "cut",
          reward_intensity: "small",
        },
        {
          question_id: "q2",
          archetype: "visual_multiple_choice",
          layout_id: "split_versus_two",
          energy: "curious",
          visual_density: "focused",
          palette_id: "purple",
          motion_id: "enter.pop",
          transition_id: "bubble_splash",
          thinking_bar_style: "star_slider",
          question_counter_style: "golden_shield",
          question_box_style: "candy_pop",
          answer_card_style: "comic_chunky",
          background_style: "candy_rays",
          thinking_seconds: 7,
          beat_intents: ["question_enter", "choice_reveal", "thinking", "answer_reveal"],
          asset_intents: ["choice_illustration"],
          mascot_state: "celebrate",
          sfx_intents: ["countdown_tick"],
          transition_intent: "cut",
          reward_intensity: "medium",
        },
        {
          question_id: "q3",
          archetype: "illustrated_multiple_choice",
          layout_id: "media_left_choices_right",
          energy: "curious",
          visual_density: "focused",
          palette_id: "purple",
          motion_id: "enter.pop",
          transition_id: "bubble_splash",
          thinking_bar_style: "star_slider",
          question_counter_style: "golden_shield",
          question_box_style: "candy_pop",
          answer_card_style: "comic_chunky",
          background_style: "candy_rays",
          thinking_seconds: 7,
          beat_intents: ["question_enter", "choice_reveal", "thinking", "answer_reveal"],
          asset_intents: ["question_illustration"],
          mascot_state: "idle",
          sfx_intents: ["countdown_tick"],
          transition_intent: "cut",
          reward_intensity: "small",
        },
      ],
    };

    // 2. Episode document
    const episode = EpisodeSchema.parse({
      episode_id: episodeId,
      channel_id: channelId,
      slug: episodeId,
      topic: { title: "Ocean and Space Quiz", premise: "Test your ocean and space knowledge", hook: "Can you score 100%?" },
      stage: "QUIZ_READY",
      script_path: "script.md",
      scene_plan_path: "scenes.json",
      dialogue_script_path: "dialogue.md",
      video_prompts_path: "prompts.md",
      narration_asset_path: "narration.wav",
      narration_generated_at: "2026-08-31T00:00:00.000Z",
      narration_duration_seconds: 27,
      narration_segment_count: 3,
      measured_narration_words_per_second: 20,
      quiz_config: {
        question_count: 3,
        quiz_format: "multiple_choice",
        visual_theme: "candy_arcade",
        palette_id: "purple",
        thinking_bar_style: "star_slider",
        question_box_style: "candy_pop",
        answer_card_style: "comic_chunky",
        question_counter_style: "golden_shield",
        background_style: "candy_rays",
      },
      video_asset_path: null,
      created_at: "2026-08-31T00:00:00.000Z",
      updated_at: "2026-08-31T00:00:00.000Z",
    });
    const epDir = path.join(channelDir, "episodes", episodeId);
    await mkdir(epDir, { recursive: true });
    await writeFile(path.join(epDir, "episode.json"), JSON.stringify(episode, null, 2), "utf8");
    repository.entityIdResolver.setEpisodeSlug(channelId, episodeId, episodeId);

    // 3. Asset Plan generated canonically via planQuizAssets
    const assetPlan = planQuizAssets(quiz, director);

    // 4. Resolved Assets and Diagnostic Images via repository.writeQuizImageAsset
    const dummyFp = "a".repeat(64);
    const resolvedAssets = [];
    for (const asset of assetPlan.assets) {
      const width = asset.sizing?.recommended_width ?? 1024;
      const height = asset.sizing?.recommended_height ?? 1024;
      const imgBytes = await generateDiagnosticImage(width, height, `${asset.subject} (${asset.aspect_ratio})`);
      const storedPath = await repository.writeQuizImageAsset(channelId, episodeId, asset.asset_id, dummyFp, imgBytes);
      resolvedAssets.push({
        ...asset,
        path: storedPath,
        source: "provider" as const,
        fingerprint: dummyFp,
        actual_dimensions: { width, height },
      });
    }

    const assetResolution: QuizAssetResolution = {
      schema_version: 2,
      episode_id: episodeId,
      template_id: "candy_arcade",
      assets: resolvedAssets,
    };

    // 5. Narration Audio
    const assetStorageDir = path.join(root, "channels", channelId, "episodes", episodeId, "assets");
    await mkdir(assetStorageDir, { recursive: true });
    const wavBytes = fakeWav(27);
    await writeFile(path.join(assetStorageDir, "narration.wav"), wavBytes);

    // 6. Voice Plan and Timeline
    const voicePlan = buildQuizVoicePlan(quiz);
    const timeline = compileQuizTimeline({
      quiz,
      director,
      voicePlan,
      targetDurationSeconds: 27,
    });

    // Write all artifacts to repository
    await repository.writeQuiz(channelId, episodeId, quiz);
    await repository.writeDirectorPlan(channelId, episodeId, director);
    await repository.writeAssetPlan(channelId, episodeId, assetPlan);
    await repository.writeQuizAssetResolution(channelId, episodeId, assetResolution);
    await repository.writeVoicePlan(channelId, episodeId, voicePlan);
    await repository.writeQuizTimeline(channelId, episodeId, timeline);

    const runtime = {
      repository,
      videoConfig: { fps: 30, render_quality: "draft", render_workers: 4 },
      logger: { ok: vi.fn(), warn: vi.fn(), error: vi.fn() },
    } as unknown as TaskManagerRuntime;

    // 7. Prepare Production Composition Context
    const context = await prepareVideoComposition({
      runtime,
      repository,
      taskId: "task-parity-render",
      channel,
      episode,
      scenes: [],
      renderAspectRatio: "16:9",
      onProgress: vi.fn().mockResolvedValue(undefined),
    });

    expect(context.html).toBeDefined();
    expect(context.sourceFingerprint).toBeDefined();

    // 8. Verify CSS Custom Properties Parity in Production HTML
    expect(context.html).toContain(".layout-visual_choices_three");
    expect(context.html).toContain("--slot-viewport-width: 432px");
    expect(context.html).toContain(".layout-split_versus_two");
    expect(context.html).toContain("--slot-viewport-width: 622px");
    expect(context.html).toContain(".layout-media_left_choices_right");
    expect(context.html).toContain("--slot-hero-viewport-width: 696px");

    // 9. Execute Real Local HyperFrames Render
    const controller = new AbortController();
    const renderResult = await executeHyperframesRender({
      renderRoot: context.renderRoot,
      outputPath: context.outputPath,
      checkpointPath: context.checkpointPath,
      sourceFingerprint: context.sourceFingerprint,
      renderCanvas: { width: 1920, height: 1080 },
      videoConfig: { fps: 30, render_quality: "draft", render_workers: 4 } as never,
      repositoryRoot: root,
      signal: controller.signal,
      logPath: path.join(context.renderRoot, "render.log"),
      onProgress: () => Promise.resolve(),
    });

    expect(renderResult.duration).toBeGreaterThan(0);
    expect(renderResult.probe.issues.length).toBe(0);
    expect(renderResult.probe.probe.streams?.some((s) => s.codec_type === "video" && s.width === 1920 && s.height === 1080)).toBe(true);
  }, 240000);
});
