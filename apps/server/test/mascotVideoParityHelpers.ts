import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  QuizV2Schema,
  type Channel,
  type ChannelMascotConfig,
  type MascotAnimationAssetV1,
  type MascotProfile,
  type QuizV2,
} from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { createAnimationStorageAdapter } from "../src/quiz/mascot/videoAnimation/adapters/animationStorageAdapter.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";

export const TINY_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73,
  68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

export const DEFAULT_PARITY_REGISTRATION = {
  source_width: 512,
  source_height: 512,
  content_bounds: { x: 20, y: 20, width: 472, height: 472 },
  pivot: { x: 256, y: 512 },
  offset_x: 0,
  offset_y: 0,
};

export const parityChannelConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_right",
  scale: 1.0,
  offset_x: 0,
  offset_y: 0,
  flip_x: false,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
};

export function createMultiQuestionQuiz(count = 4): QuizV2 {
  return QuizV2Schema.parse({
    schema_version: 2,
    episode_id: "ep-parity-multi-video",
    age_band: "7-9",
    language: "English",
    questions: Array.from({ length: count }, (_, i) => ({
      id: `q-parity-0${i + 1}`,
      number: i + 1,
      format: "multiple_choice",
      difficulty: 1,
      question: `Multi-Question Parity Question ${i + 1}?`,
      choices: [
        { id: "c1", text: "Alpha Choice" },
        { id: "c2", text: "Beta Choice" },
        { id: "c3", text: "Gamma Choice" },
      ],
      correct_choice_id: "c1",
      explanation: `Explanation for parity question ${i + 1}.`,
      fun_fact: `Fun fact for parity question ${i + 1}.`,
      source_ids: [`SRC_${i + 1}`],
      visual_opportunity: `Visual theme for question ${i + 1}`,
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    })),
  });
}

export function compileTestTimeline(quiz: QuizV2) {
  const director = createDefaultDirectorPlan(quiz);
  const voicePlan = buildQuizVoicePlan(quiz);
  const timeline = compileQuizTimeline({ quiz, director, voicePlan });
  return { director, voicePlan, timeline };
}

export function createVideoAnimationAsset(
  mascotId: string,
  state: "thinking" | "celebrate",
  slotIndex: number,
  loop = true,
  durationMs = 4000,
  fps = 24,
): MascotAnimationAssetV1 {
  const frameCount = Math.round((durationMs / 1000) * fps);
  return {
    version: 1,
    state,
    atlas_url: `/api/mascots/${mascotId}/styles/core/animations/${state}/${slotIndex}/artifacts/atlas.png`,
    manifest_url: `/api/mascots/${mascotId}/styles/core/animations/${state}/${slotIndex}/artifacts/manifest.json`,
    transparent_video_url: `/api/mascots/${mascotId}/styles/core/animations/${state}/${slotIndex}/artifacts/video_transparent.webm`,
    alpha_codec: "vp9_alpha",
    duration_ms: durationMs,
    frame_count: frameCount,
    fps,
    loop,
    loop_policy: loop ? "loop" : "one_shot_rest",
    frames: Array.from({ length: frameCount }, (_, i) => ({
      index: i,
      x: 0,
      y: 0,
      width: 512,
      height: 512,
      duration_ms: Math.round(1000 / fps),
    })),
    registration: DEFAULT_PARITY_REGISTRATION,
    content_fingerprint: `content-${state}-slot-${slotIndex}`,
    source_fingerprint: `source-${state}-slot-${slotIndex}`,
    slot_index: slotIndex,
    recipe_id: `${state}-s${slotIndex}-video`,
  };
}

export async function setupParityMascotWorkspace(tempDir: string) {
  const repository = new RepositoryService(tempDir);
  await repository.ensureBootstrap();

  const baseMascot = await repository.saveMascot({ name: "Parity Owl" });
  const mascotId = baseMascot.id;

  await repository.saveMascotAsset(mascotId, "master.png", TINY_PNG);
  await repository.saveMascotAsset(mascotId, "idle.png", TINY_PNG);
  await repository.saveMascotAsset(mascotId, "anchor.png", TINY_PNG);
  await repository.saveMascotAsset(mascotId, "think_slot1.png", TINY_PNG);
  await repository.saveMascotAsset(mascotId, "celeb_slot2.png", TINY_PNG);

  const storageAdapter = createAnimationStorageAdapter(repository.storageRoot);

  const thinkingSlot2Dir = storageAdapter.getSlotDir(mascotId, "core", "thinking", 2);
  await mkdir(thinkingSlot2Dir, { recursive: true });
  const mockWebmThinking = Buffer.from("MOCK-WEBM-THINKING-SLOT2-DATA");
  const mockAtlas = Buffer.from(TINY_PNG);
  const mockManifest = JSON.stringify({ version: 1, state: "thinking", slot_index: 2 });
  await writeFile(path.join(thinkingSlot2Dir, "video_transparent.webm"), mockWebmThinking);
  await writeFile(path.join(thinkingSlot2Dir, "atlas.png"), mockAtlas);
  await writeFile(path.join(thinkingSlot2Dir, "manifest.json"), mockManifest);

  const celebrateSlot1Dir = storageAdapter.getSlotDir(mascotId, "core", "celebrate", 1);
  await mkdir(celebrateSlot1Dir, { recursive: true });
  const mockWebmCelebrate = Buffer.from("MOCK-WEBM-CELEBRATE-SLOT1-DATA");
  await writeFile(path.join(celebrateSlot1Dir, "video_transparent.webm"), mockWebmCelebrate);
  await writeFile(path.join(celebrateSlot1Dir, "atlas.png"), mockAtlas);
  await writeFile(path.join(celebrateSlot1Dir, "manifest.json"), mockManifest);

  const fullMascot: Partial<MascotProfile> & { name: string } = {
    ...baseMascot,
    master_image_url: `/api/mascots/${mascotId}/assets/master.png`,
    actions: {
      idle: {
        action: "idle",
        sprite_url: `/api/mascots/${mascotId}/assets/idle.png`,
        frames_count: 1,
        fps: 8,
        loop: true,
        frame_width: 512,
        frame_height: 512,
        offset_x: 0,
        offset_y: 0,
        motion_preset: "breathe",
      },
    },
    styles: [
      {
        id: "core",
        name: "Core Style",
        keyword: "core",
        anchor_image_url: `/api/mascots/${mascotId}/assets/anchor.png`,
        is_default: true,
        states: {
          thinking: [
            {
              id: "think_s1",
              slot_index: 1,
              image_url: `/api/mascots/${mascotId}/assets/think_slot1.png`,
              motion_preset: "sway",
            },
            {
              id: "think_s2",
              slot_index: 2,
              image_url: `/api/mascots/${mascotId}/assets/think_slot1.png`,
              status: "ready",
              animation: createVideoAnimationAsset(mascotId, "thinking", 2, true, 4000, 24),
            },
          ],
          celebrate: [
            {
              id: "celeb_s1",
              slot_index: 1,
              image_url: `/api/mascots/${mascotId}/assets/celeb_slot2.png`,
              status: "ready",
              animation: createVideoAnimationAsset(mascotId, "celebrate", 1, false, 6000, 30),
            },
            {
              id: "celeb_s2",
              slot_index: 2,
              image_url: `/api/mascots/${mascotId}/assets/celeb_slot2.png`,
              motion_preset: "jump",
            },
          ],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };
  const savedMascot = await repository.saveMascot(fullMascot);

  const channel: Channel = {
    channel_id: "ch_parity",
    channel_name: "Channel Parity",
    slug: "channel-parity",
    language: "en",
    visual_theme: "candy_arcade",
    target_duration_seconds: 60,
    mascot_id: savedMascot.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    repository,
    channel,
    mascot: savedMascot,
    mockWebmThinking,
    mockWebmCelebrate,
    mockAtlas,
    mockManifest,
  };
}

export function extractVideoTagAttributes(videoTag: string) {
  const getAttr = (name: string) => videoTag.match(new RegExp(`${name}="([^"]+)"`))?.[1] ?? null;
  return {
    id: getAttr("id"),
    src: getAttr("src"),
    dataStart: getAttr("data-start"),
    dataDuration: getAttr("data-duration"),
    dataVideoTime: getAttr("data-mascot-video-time"),
    dataVideoCycle: getAttr("data-mascot-video-cycle"),
    dataAnimationVideo: getAttr("data-mascot-animation-video"),
    isLoop: videoTag.includes(" loop"),
    isAutoplay: videoTag.includes(" autoplay"),
    isMuted: videoTag.includes(" muted"),
    isPlaysinline: videoTag.includes(" playsinline"),
  };
}

export function findQuestionComposition(files: Record<string, string>, questionNum: number): string | undefined {
  const key = Object.keys(files).find((k) => k.startsWith(`compositions/quiz-q${questionNum}-`));
  return key ? files[key] : undefined;
}
