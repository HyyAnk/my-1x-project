import { describe, expect, it } from "vitest";
import {
  adaptMascotV1ToV2,
  FRAME_DURATION_MS,
  QuizV2Schema,
  resolveAnimationFrameAtTime,
  type ChannelMascotConfig,
  type MascotAnimationAssetV1,
  type MascotFrameRect,
  type MascotProfile,
} from "@studio/shared";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { renderPreviewMascotHtmlLayer } from "../src/quiz/render/previewMascotRenderer.js";
import {
  adaptMascotForPhase,
  adaptMascotForQuestion,
  createMascotAnimationRenderSnapshot,
  findSnapshotEntry,
  hasDedicatedAction,
  renderProductionMascotAtTime,
  renderProductionMascotHtmlLayer,
  resolveEffectiveRenderBundle,
  synchronizeBundleVisibility,
} from "../src/quiz/render/productionMascotRenderer.js";
import {
  resolveProductionMascotTimelineAtTime,
  resolveProductionTimelineFrames,
  type ProductionMascotRenderOptions,
} from "../src/quiz/render/productionMascotTimeline.js";

function create12Frames(): MascotFrameRect[] {
  return Array.from({ length: 12 }, (_, i) => ({
    index: i,
    x: (i % 4) * 128,
    y: Math.floor(i / 4) * 128,
    width: 128,
    height: 128,
    duration_ms: FRAME_DURATION_MS,
  }));
}

function createAnimationAsset(state: "thinking" | "celebrate", loop: boolean): MascotAnimationAssetV1 {
  return {
    version: 1,
    state,
    atlas_url: `/mascot/assets/owl/${state}/atlas.png`,
    manifest_url: `/mascot/assets/owl/${state}/manifest.json`,
    frame_count: 12,
    fps: 8,
    loop,
    loop_policy: loop ? "loop" : "one_shot_rest",
    frames: create12Frames(),
    registration: {
      source_width: 512,
      source_height: 384,
      content_bounds: { x: 10, y: 10, width: 108, height: 108 },
      pivot: { x: 64, y: 128 },
      offset_x: 0,
      offset_y: 0,
    },
    content_fingerprint: `content-${state}-hash-0123456789`,
    source_fingerprint: `source-${state}-hash-9876543210`,
    slot_index: 1,
    recipe_id: `${state}-01-primary`,
  };
}

function createVideoAnimationAsset(state: "thinking" | "celebrate", loop: boolean, durationMs = 4000, fps = 24): MascotAnimationAssetV1 {
  const frameCount = Math.round((durationMs / 1000) * fps);
  return {
    version: 1,
    state,
    atlas_url: "",
    manifest_url: `/mascot/assets/owl/${state}/manifest.json`,
    transparent_video_url: `/mascot/assets/owl/${state}/video_transparent.webm`,
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
    registration: {
      source_width: 512,
      source_height: 512,
      content_bounds: { x: 20, y: 20, width: 472, height: 472 },
      pivot: { x: 256, y: 512 },
      offset_x: 0,
      offset_y: 0,
    },
    content_fingerprint: `content-${state}-hash-video`,
    source_fingerprint: `source-${state}-hash-video`,
    slot_index: 1,
    recipe_id: `${state}-01-video`,
  };
}

const channelConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_right",
  scale: 1.5,
  offset_x: 20,
  offset_y: 50,
  flip_x: false,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
};

const animatedMascot: MascotProfile = {
  id: "owl-animated",
  name: "Professor Owl",
  description: "Wise scholarly owl with animated sprite sheet",
  visual_style: "pixar_3d",
  master_prompt: "A wise scholarly owl with round spectacles",
  master_image_url: "/mascot/assets/owl/master.png",
  color_theme: "#4f46e5",
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  actions: {
    idle: {
      action: "idle",
      sprite_url: "/mascot/assets/owl/idle.png",
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
    },
  },
  styles: [
    {
      id: "style-academic",
      name: "Academic Core",
      keyword: "scholarly",
      anchor_image_url: "/mascot/assets/owl/anchor.png",
      is_default: true,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      states: {
        thinking: [
          {
            id: "owl-thinking-1",
            slot_index: 1,
            image_url: "/mascot/assets/owl/thinking/provenance.png",
            status: "ready",
            animation: createAnimationAsset("thinking", true),
          },
        ],
        celebrate: [
          {
            id: "owl-celebrate-1",
            slot_index: 1,
            image_url: "/mascot/assets/owl/celebrate/provenance.png",
            status: "ready",
            animation: createAnimationAsset("celebrate", false),
          },
        ],
      },
    },
  ],
  render_bundle: adaptMascotV1ToV2(
    {
      id: "owl-animated",
      name: "Professor Owl",
      description: "Wise scholarly owl with animated sprite sheet",
      visual_style: "pixar_3d",
      master_prompt: "A wise scholarly owl with round spectacles",
      master_image_url: "/mascot/assets/owl/master.png",
      color_theme: "#4f46e5",
      actions: {
        idle: {
          action: "idle",
          sprite_url: "/mascot/assets/owl/idle.png",
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
        },
      },
      assigned_channel_ids: [],
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
    channelConfig,
  )!,
};

const videoAnimatedMascot: MascotProfile = {
  id: "owl-transparent-video",
  name: "Professor Owl Video",
  description: "Wise scholarly owl with transparent WebM animation",
  visual_style: "pixar_3d",
  master_prompt: "A wise scholarly owl with round spectacles",
  master_image_url: "/mascot/assets/owl/master.png",
  color_theme: "#4f46e5",
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  actions: {
    idle: {
      action: "idle",
      sprite_url: "/mascot/assets/owl/idle.png",
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
    },
  },
  styles: [
    {
      id: "style-academic",
      name: "Academic Core",
      keyword: "scholarly",
      anchor_image_url: "/mascot/assets/owl/anchor.png",
      is_default: true,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      states: {
        thinking: [
          {
            id: "owl-thinking-video",
            slot_index: 1,
            image_url: "/mascot/assets/owl/thinking/provenance.png",
            status: "ready",
            animation: createVideoAnimationAsset("thinking", true, 4000, 24),
          },
        ],
        celebrate: [
          {
            id: "owl-celebrate-video",
            slot_index: 1,
            image_url: "/mascot/assets/owl/celebrate/provenance.png",
            status: "ready",
            animation: createVideoAnimationAsset("celebrate", false, 10000, 30),
          },
        ],
      },
    },
  ],
  render_bundle: adaptMascotV1ToV2(
    {
      id: "owl-transparent-video",
      name: "Professor Owl Video",
      description: "Wise scholarly owl with transparent WebM animation",
      visual_style: "pixar_3d",
      master_prompt: "A wise scholarly owl with round spectacles",
      master_image_url: "/mascot/assets/owl/master.png",
      color_theme: "#4f46e5",
      actions: {
        idle: {
          action: "idle",
          sprite_url: "/mascot/assets/owl/idle.png",
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
        },
      },
      assigned_channel_ids: [],
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
    channelConfig,
  )!,
};

const stillMascot: MascotProfile = {
  id: "owl-still",
  name: "Professor Owl Still",
  description: "Legacy still mascot without animation asset",
  visual_style: "pixar_3d",
  master_prompt: "A wise scholarly owl with round spectacles",
  master_image_url: "/mascot/assets/owl/master.png",
  color_theme: "#4f46e5",
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  actions: {},
  styles: [
    {
      id: "style-academic",
      name: "Academic Core",
      keyword: "scholarly",
      anchor_image_url: "/mascot/assets/owl/anchor.png",
      is_default: true,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      states: {
        thinking: [
          {
            id: "owl-thinking-still",
            slot_index: 1,
            image_url: "/mascot/assets/owl/thinking_still.png",
            motion_preset: "sway",
            motion_speed: 1.2,
            motion_intensity: "dynamic",
          },
        ],
        celebrate: [
          {
            id: "owl-celebrate-still",
            slot_index: 1,
            image_url: "/mascot/assets/owl/celebrate_still.png",
            motion_preset: "jump",
            motion_speed: 1.5,
            motion_intensity: "dynamic",
          },
        ],
      },
    },
  ],
  render_bundle: adaptMascotV1ToV2(
    {
      id: "owl-still",
      name: "Professor Owl Still",
      description: "Legacy still mascot without animation asset",
      visual_style: "pixar_3d",
      master_prompt: "A wise scholarly owl with round spectacles",
      master_image_url: "/mascot/assets/owl/master.png",
      color_theme: "#4f46e5",
      actions: {},
      assigned_channel_ids: [],
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    },
    channelConfig,
  )!,
};

describe("Mascot Renderer Integration (Phase 7: Stages 13 & 14)", () => {
  describe("Stage 13: HTML Preview Renderer Integration", () => {
    it("renders atlas sprite markup with exact frame coordinates at given timestamps", () => {
      // 0.0s -> frame 0 (x: 0, y: 0)
      const html0 = renderPreviewMascotHtmlLayer(animatedMascot, channelConfig, {
        aspectRatio: "16:9",
        phase: "thinking",
        timelineTimeSeconds: 0.0,
        playing: true,
      });

      expect(html0).toContain('data-mascot-animation-frame="0"');
      expect(html0).toContain('data-mascot-frame-index="0"');
      expect(html0).toContain('data-mascot-animation-atlas="/mascot/assets/owl/thinking/atlas.png"');
      expect(html0).toContain("background-position:0px 0px");
      expect(html0).toContain("--mascot-frame-width:128px");
      expect(html0).toContain("--mascot-frame-height:128px");

      // 0.125s -> frame 1 (x: 128, y: 0)
      const html1 = renderPreviewMascotHtmlLayer(animatedMascot, channelConfig, {
        aspectRatio: "16:9",
        phase: "thinking",
        timelineTimeSeconds: 0.125,
        playing: true,
      });

      expect(html1).toContain('data-mascot-animation-frame="1"');
      expect(html1).toContain("background-position:-128px 0px");

      // 0.375s -> frame 3 (x: 384, y: 0)
      const html3 = renderPreviewMascotHtmlLayer(animatedMascot, channelConfig, {
        aspectRatio: "16:9",
        phase: "thinking",
        timelineTimeSeconds: 0.375,
        playing: true,
      });

      expect(html3).toContain('data-mascot-animation-frame="3"');
      expect(html3).toContain("background-position:-384px 0px");

      // 0.5s -> frame 4 (x: 0, y: 128)
      const html4 = renderPreviewMascotHtmlLayer(animatedMascot, channelConfig, {
        aspectRatio: "16:9",
        phase: "thinking",
        timelineTimeSeconds: 0.5,
        playing: true,
      });

      expect(html4).toContain('data-mascot-animation-frame="4"');
      expect(html4).toContain("background-position:0px -128px");

      // 1.5s -> loop wrap back to frame 0 for thinking
      const htmlWrap = renderPreviewMascotHtmlLayer(animatedMascot, channelConfig, {
        aspectRatio: "16:9",
        phase: "thinking",
        timelineTimeSeconds: 1.5,
        playing: true,
      });

      expect(htmlWrap).toContain('data-mascot-animation-frame="0"');
      expect(htmlWrap).toContain("background-position:0px 0px");
    });

    it("verifies asset localization is applied to atlas URLs in preview", () => {
      const localizedHtml = renderPreviewMascotHtmlLayer(animatedMascot, channelConfig, {
        aspectRatio: "16:9",
        phase: "thinking",
        timelineTimeSeconds: 0.125,
        playing: true,
        sourceMapper: (url) => `https://cdn.hyperframes.local${url}`,
      });

      expect(localizedHtml).toContain('data-mascot-animation-atlas="https://cdn.hyperframes.local/mascot/assets/owl/thinking/atlas.png"');
      expect(localizedHtml).toContain("--mascot-art-url:url('https://cdn.hyperframes.local/mascot/assets/owl/thinking/atlas.png')");
    });

    it("falls back to legacy image rendering when animation asset is absent", () => {
      const stillHtml = renderPreviewMascotHtmlLayer(stillMascot, channelConfig, {
        aspectRatio: "16:9",
        phase: "thinking",
        timelineTimeSeconds: 0.5,
        playing: true,
      });

      expect(stillHtml).not.toContain("data-mascot-animation-frame");
      expect(stillHtml).not.toContain("mascot-v2-animation-art");
      expect(stillHtml).toContain('data-mascot-asset-url="/mascot/assets/owl/thinking_still.png"');
    });

    it("resolveEffectiveRenderBundle prioritizes native V2 render_bundle over legacy actions", () => {
      expect(animatedMascot.render_bundle).toBeDefined();
      const resolved = resolveEffectiveRenderBundle(animatedMascot, channelConfig);
      expect(resolved).not.toBeNull();
      expect(resolved?.config.version).toBe(2);
      expect(resolved?.assets.actions.idle?.action).toBe("idle");
      expect(resolved?.assets.actions.idle?.image_url).toBe("/mascot/assets/owl/idle.png");
      expect(resolved?.config.placements["16:9"].anchor).toBe("bottom_right");
    });
  });

  describe("Stage 14: Production Renderer & Timeline Integration", () => {
    const renderOptions: ProductionMascotRenderOptions = {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 10,
      timelineEvents: [
        { type: "choices.enter", at_seconds: 2.0 },
        { type: "countdown.start", at_seconds: 3.0 },
        { type: "answer.reveal", at_seconds: 7.0 },
      ],
      revealOutcome: "correct",
    };

    it("production mascot timeline resolves deterministic frames across video duration", () => {
      // Create bundle by adapting mascot
      const effectiveMascot = adaptMascotForPhase(animatedMascot, "question");
      const bundle = adaptMascotV1ToV2(effectiveMascot, channelConfig);
      expect(bundle).toBeTruthy();
      if (effectiveMascot && hasDedicatedAction(effectiveMascot, "idle")) {
        bundle!.config.visibility.phase_rules.question.action = "idle";
      }

      // At 1.0s (question / idle phase)
      const frameAt1s = resolveProductionMascotTimelineAtTime(renderOptions, bundle!, 1.0);
      expect(frameAt1s).not.toBeNull();
      expect(frameAt1s!.phase).toBe("question");
      expect(frameAt1s!.action).toBe("idle");
      expect(frameAt1s!.animationFrameIndex).toBeUndefined();

      // At 3.0s (start of thinking: elapsed = 0.0s -> frame 0)
      const frameAt3s = resolveProductionMascotTimelineAtTime(renderOptions, bundle!, 3.0);
      expect(frameAt3s).not.toBeNull();
      expect(frameAt3s!.phase).toBe("thinking");
      expect(frameAt3s!.action).toBe("thinking");
      expect(frameAt3s!.animationFrameIndex).toBe(0);

      // At 3.125s (125ms into thinking -> frame 1)
      const frameAt3_125s = resolveProductionMascotTimelineAtTime(renderOptions, bundle!, 3.125);
      expect(frameAt3_125s!.animationFrameIndex).toBe(1);

      // At 4.5s (1.5s into thinking -> loop wrap to frame 0)
      const frameAt4_5s = resolveProductionMascotTimelineAtTime(renderOptions, bundle!, 4.5);
      expect(frameAt4_5s!.animationFrameIndex).toBe(0);

      // At 7.0s (start of reveal / celebrate: elapsed = 0.0s -> frame 0)
      const frameAt7s = resolveProductionMascotTimelineAtTime(renderOptions, bundle!, 7.0);
      expect(frameAt7s!.phase).toBe("reveal");
      expect(frameAt7s!.action).toBe("celebrate");
      expect(frameAt7s!.animationFrameIndex).toBe(0);

      // At 8.375s (1.375s into celebrate -> frame 11)
      const frameAt8_375s = resolveProductionMascotTimelineAtTime(renderOptions, bundle!, 8.375);
      expect(frameAt8_375s!.animationFrameIndex).toBe(11);
      expect(frameAt8_375s!.isClamped).toBe(false);

      // At 8.5s+ (1.5s+ into celebrate -> clamped to frame 11 under one_shot_rest)
      const frameAt9s = resolveProductionMascotTimelineAtTime(renderOptions, bundle!, 9.0);
      expect(frameAt9s!.animationFrameIndex).toBe(11);
      expect(frameAt9s!.isClamped).toBe(true);

      // Resolve full timeline sequence (10s at 8 FPS = 80 frames)
      const allFrames = resolveProductionTimelineFrames(renderOptions, bundle!, 8);
      expect(allFrames.length).toBe(80);
      for (const f of allFrames) {
        expect(f.timeSeconds).toBeGreaterThanOrEqual(0);
        expect(f.timeSeconds).toBeLessThan(10);
      }
    });

    it("satisfies HyperFrames seekability: seeking to arbitrary seconds yields identical markup without clock drift", () => {
      const timestampsToTest = [0.0, 3.125, 4.375, 7.25, 8.75];

      for (const timestamp of timestampsToTest) {
        const render1 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, timestamp);
        const render2 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, timestamp);

        // Strict bitwise string equality without clock drift
        expect(render1).toBe(render2);
        expect(render1.length).toBeGreaterThan(0);
      }
    });

    it("removes CSS keyframe motion fallback when 12-frame animation is present", () => {
      // When animation is present: motion is suppressed (preset="none", motion-none)
      const animatedHtml = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 3.25);
      expect(animatedHtml).toContain('data-mascot-motion-preset="none"');
      expect(animatedHtml).toContain('class="mascot-v2-motion motion-none"');
      expect(animatedHtml).toContain("mascot-v2-animation-art");

      // When animation is absent: CSS keyframe motion remains active
      const stillHtml = renderProductionMascotAtTime(stillMascot, channelConfig, renderOptions, 3.25);
      expect(stillHtml).toContain('data-mascot-motion-preset="sway"');
      expect(stillHtml).toContain('class="mascot-v2-motion motion-sway"');
      expect(stillHtml).not.toContain("mascot-v2-animation-art");
    });

    it("renders exact frame indices and background positions at every 125ms tick of thinking and celebrate", () => {
      // 3.0s (start of thinking) -> frame 0
      const html3_0 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 3.0);
      expect(html3_0).toContain('data-mascot-animation-frame="0"');
      expect(html3_0).toContain("background-position:0px 0px");

      // 3.125s (125ms into thinking) -> frame 1
      const html3_125 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 3.125);
      expect(html3_125).toContain('data-mascot-animation-frame="1"');
      expect(html3_125).toContain("background-position:-128px 0px");

      // 3.250s (250ms into thinking) -> frame 2
      const html3_25 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 3.25);
      expect(html3_25).toContain('data-mascot-animation-frame="2"');
      expect(html3_25).toContain("background-position:-256px 0px");

      // 4.375s (1.375s into thinking) -> frame 11
      const html4_375 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 4.375);
      expect(html4_375).toContain('data-mascot-animation-frame="11"');
      expect(html4_375).toContain("background-position:-384px -256px");

      // 4.5s (1.5s into thinking -> loop wrap) -> frame 0
      const html4_5 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 4.5);
      expect(html4_5).toContain('data-mascot-animation-frame="0"');
      expect(html4_5).toContain("background-position:0px 0px");

      // 7.0s (start of reveal / celebrate: elapsed = 0.0s) -> frame 0
      const html7_0 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 7.0);
      expect(html7_0).toContain('data-mascot-animation-frame="0"');
      expect(html7_0).toContain("background-position:0px 0px");

      // 7.125s (125ms into celebrate) -> frame 1
      const html7_125 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 7.125);
      expect(html7_125).toContain('data-mascot-animation-frame="1"');
      expect(html7_125).toContain("background-position:-128px 0px");

      // 7.250s (250ms into celebrate) -> frame 2
      const html7_25 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 7.25);
      expect(html7_25).toContain('data-mascot-animation-frame="2"');
      expect(html7_25).toContain("background-position:-256px 0px");

      // 8.375s (1.375s into celebrate) -> frame 11
      const html8_375 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 8.375);
      expect(html8_375).toContain('data-mascot-animation-frame="11"');
      expect(html8_375).toContain("background-position:-384px -256px");

      // 8.5s+ (1.5s+ into celebrate: one_shot_rest clamped to frame 11)
      const html8_5 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 8.5);
      expect(html8_5).toContain('data-mascot-animation-frame="11"');
      expect(html8_5).toContain("background-position:-384px -256px");

      const html9_0 = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, 9.0);
      expect(html9_0).toContain('data-mascot-animation-frame="11"');
    });

    it("applies final bottom-left placement at preview/render time without mutating source frame rectangles", () => {
      const bottomLeftConfig: ChannelMascotConfig = {
        enabled: true,
        position: "bottom_left",
        scale: 1.25,
        offset_x: 32,
        offset_y: -16,
        flip_x: true,
        show_in_intro: true,
        show_in_outro: true,
        show_in_question: true,
      };

      const html = renderProductionMascotAtTime(animatedMascot, bottomLeftConfig, renderOptions, 3.125);

      // Verify placement is applied via CSS variables & classes on the container
      expect(html).toContain("anchor-bottom_left");
      expect(html).toContain("--mascot-placement-offset-x:32px");
      expect(html).toContain("--mascot-placement-offset-y:-16px");
      expect(html).toContain("--mascot-scale:1.25");
      expect(html).toContain("--mascot-flip-sign:-1");

      // Verify source frame rectangles remain unmutated neutral coordinates
      expect(html).toContain('data-mascot-frame-x="128"');
      expect(html).toContain('data-mascot-frame-y="0"');
      expect(html).toContain('data-mascot-frame-width="128"');
      expect(html).toContain('data-mascot-frame-height="128"');
    });

    it("renders full composition HTML layer with CSS atlas animation and localized assets", () => {
      const fullHtml = renderProductionMascotHtmlLayer(animatedMascot, channelConfig, {
        ...renderOptions,
        sourceMapper: (url) => `https://cdn.hyperframes.local${url}`,
      });

      // Contains atlas image URL with localization
      expect(fullHtml).toContain('data-mascot-animation-atlas="https://cdn.hyperframes.local/mascot/assets/owl/thinking/atlas.png"');
      expect(fullHtml).toContain('data-mascot-animation-atlas="https://cdn.hyperframes.local/mascot/assets/owl/celebrate/atlas.png"');

      // Contains CSS atlas animation declarations
      expect(fullHtml).toContain("--mascot-atlas-cycle:1.5s");
      expect(fullHtml).toContain("animation:mascot-v2-atlas-loop 1.5s steps(1)");
      expect(fullHtml).toContain("animation:mascot-v2-atlas-oneshot 1.5s steps(1)");
    });

    it("achieves 100% parity across timeline resolver, HTML renderer, and shared frame math", () => {
      const effectiveMascot = adaptMascotForPhase(animatedMascot, "question");
      const bundle = adaptMascotV1ToV2(effectiveMascot, channelConfig);
      expect(bundle).toBeTruthy();
      if (effectiveMascot && hasDedicatedAction(effectiveMascot, "idle")) {
        bundle!.config.visibility.phase_rules.question.action = "idle";
      }

      // Check all 80 frames across the 10s question clip (8 FPS)
      for (let i = 0; i < 80; i++) {
        const timestamp = i * 0.125;
        const timelineFrame = resolveProductionMascotTimelineAtTime(renderOptions, bundle!, timestamp);
        expect(timelineFrame).not.toBeNull();

        const html = renderProductionMascotAtTime(animatedMascot, channelConfig, renderOptions, timestamp);

        if (timelineFrame!.animationFrameIndex !== undefined) {
          // HTML renderer and timeline frame resolver must agree on the exact frame index
          expect(html).toContain(`data-mascot-animation-frame="${timelineFrame!.animationFrameIndex}"`);

          // Background position must match exact atlas offset
          const expectedBgPos = timelineFrame!.atlasOffsets!.cssBackgroundPosition;
          expect(html).toContain(`background-position:${expectedBgPos}`);

          // Compare with shared resolveAnimationFrameAtTime directly
          const isThinking = timelineFrame!.phase === "thinking";
          const animAsset = isThinking
            ? animatedMascot.styles[0].states.thinking[0].animation!
            : animatedMascot.styles[0].states.celebrate[0].animation!;
          const elapsed = timestamp - timelineFrame!.marker.atSeconds;
          const directResolved = resolveAnimationFrameAtTime(animAsset, elapsed);

          expect(timelineFrame!.animationFrameIndex).toBe(directResolved.frameIndex);
          expect(timelineFrame!.atlasOffsets!.cssBackgroundPosition).toBe(directResolved.atlasOffsets.cssBackgroundPosition);
        }
      }
    });

    it("captures and restores deterministic snapshots across render and re-render", () => {
      const snapshot = createMascotAnimationRenderSnapshot("video-ep-101");

      const questionMascot1 = adaptMascotForQuestion(animatedMascot, "style-academic", 0, {
        videoId: "video-ep-101",
        questionId: "q-1",
        snapshot,
      });

      expect(snapshot.entries.length).toBe(2); // thinking + celebrate
      const thinkingEntry = findSnapshotEntry(snapshot, {
        videoId: "video-ep-101",
        questionId: "q-1",
        state: "thinking",
        styleId: "style-academic",
      });
      expect(thinkingEntry).toBeDefined();
      expect(thinkingEntry!.slot_index).toBe(1);
      expect(thinkingEntry!.atlas_url).toBe("/mascot/assets/owl/thinking/atlas.png");

      // Re-render with existing snapshot recovers identical variant
      const questionMascot2 = adaptMascotForQuestion(animatedMascot, "style-academic", 0, {
        videoId: "video-ep-101",
        questionId: "q-1",
        snapshot,
      });

      expect(questionMascot2?.render_bundle?.assets.actions.thinking?.image_url).toBe(
        questionMascot1?.render_bundle?.assets.actions.thinking?.image_url,
      );
    });
  });

  describe("Transparent Video Animation (Option B) Production Renderer", () => {
    const renderOptions: ProductionMascotRenderOptions = {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 12,
      timelineEvents: [
        { type: "choices.enter", at_seconds: 2.0 },
        { type: "countdown.start", at_seconds: 3.0 },
        { type: "answer.reveal", at_seconds: 8.0 },
      ],
      revealOutcome: "correct",
    };

    it("renders video element with transparent WebM and required data attributes", () => {
      const html = renderProductionMascotAtTime(videoAnimatedMascot, channelConfig, renderOptions, 3.5);

      // Must render <video> element with both mascot-v2-animation-art and mascot-v2-animation-video
      expect(html).toContain("<video");
      expect(html).toContain('class="mascot-v2-frame mascot-v2-animation-art mascot-v2-animation-video"');
      expect(html).toContain('id="mascot-video-thinking-1-0"');
      expect(html).toContain('data-start="0"');
      expect(html).toContain('data-duration="5"');
      expect(html).toContain("autoplay");
      expect(html).toContain("muted");
      expect(html).toContain("playsinline");
      expect(html).toContain("loop");
      expect(html).toContain('src="/mascot/assets/owl/thinking/video_transparent.webm"');
      expect(html).toContain('data-mascot-animation-video="/mascot/assets/owl/thinking/video_transparent.webm"');
      expect(html).toContain('data-mascot-video-cycle="4"');
      expect(html).toContain('data-mascot-video-time="0.5"'); // 3.5 - 3.0 = 0.5s into 4s cycle
    });

    it("renders video element adhering strictly to HyperFrames contract in production composition", () => {
      const fullHtml = renderProductionMascotHtmlLayer(videoAnimatedMascot, channelConfig, renderOptions);

      // Thinking video state (starts at 3.0s, duration = 8.0 - 3.0 = 5.0s, loop = true)
      expect(fullHtml).toContain('id="mascot-video-thinking-1-3000"');
      expect(fullHtml).toContain('data-start="3"');
      expect(fullHtml).toContain('data-duration="5"');
      expect(fullHtml).toContain('src="/mascot/assets/owl/thinking/video_transparent.webm"');

      // Celebrate video state (starts at 8.0s, duration = 12.0 - 8.0 = 4.0s, one-shot)
      expect(fullHtml).toContain('id="mascot-video-celebrate-1-8000"');
      expect(fullHtml).toContain('data-start="8"');
      expect(fullHtml).toContain('data-duration="4"');
      expect(fullHtml).toContain('src="/mascot/assets/owl/celebrate/video_transparent.webm"');
    });

    it("localizes video URL when custom sourceMapper is provided", () => {
      const html = renderProductionMascotHtmlLayer(videoAnimatedMascot, channelConfig, {
        ...renderOptions,
        sourceMapper: (url) => `https://offline-cache.local${url}`,
      });

      expect(html).toContain('src="https://offline-cache.local/mascot/assets/owl/thinking/video_transparent.webm"');
      expect(html).toContain('data-mascot-animation-video="https://offline-cache.local/mascot/assets/owl/thinking/video_transparent.webm"');
    });

    it("calculates exact deterministic seek time and looping for dynamic 4s and 10s animations", () => {
      // Thinking: 4s loop starting at 3.0s
      // t = 3.0s: elapsed = 0.0s -> seek = 0
      const htmlAt3s = renderProductionMascotAtTime(videoAnimatedMascot, channelConfig, renderOptions, 3.0);
      expect(htmlAt3s).toContain('data-mascot-video-time="0"');

      // t = 5.5s: elapsed = 2.5s -> seek = 2.5
      const htmlAt5_5s = renderProductionMascotAtTime(videoAnimatedMascot, channelConfig, renderOptions, 5.5);
      expect(htmlAt5_5s).toContain('data-mascot-video-time="2.5"');

      // t = 7.5s: elapsed = 4.5s -> 4.5 % 4.0 = 0.5s loop wrap
      const htmlAt7_5s = renderProductionMascotAtTime(videoAnimatedMascot, channelConfig, renderOptions, 7.5);
      expect(htmlAt7_5s).toContain('data-mascot-video-time="0.5"');

      // Celebrate: 10s one-shot starting at 8.0s
      // t = 9.0s: elapsed = 1.0s -> seek = 1
      const htmlAt9s = renderProductionMascotAtTime(videoAnimatedMascot, channelConfig, renderOptions, 9.0);
      expect(htmlAt9s).toContain('data-mascot-video-cycle="10"');
      expect(htmlAt9s).toContain('data-mascot-video-time="1"');
      expect(htmlAt9s).not.toContain("loop"); // one-shot does not loop

      // t = 20.0s: elapsed = 12.0s -> clamped to 10s (end of one_shot_rest)
      const htmlAt20s = renderProductionMascotAtTime(videoAnimatedMascot, channelConfig, renderOptions, 20.0);
      expect(htmlAt20s).toContain('data-mascot-video-time="10"');
    });

    it("timeline frame resolver matches HTML renderer seek time and frame calculation", () => {
      const effectiveMascot = adaptMascotForPhase(videoAnimatedMascot, "question");
      const bundle = adaptMascotV1ToV2(effectiveMascot, channelConfig);
      expect(bundle).toBeTruthy();

      const timePoints = [3.0, 4.25, 6.0, 7.8, 8.5, 11.0];
      for (const t of timePoints) {
        const frame = resolveProductionMascotTimelineAtTime(renderOptions, bundle!, t);
        expect(frame).not.toBeNull();
        const html = renderProductionMascotAtTime(videoAnimatedMascot, channelConfig, renderOptions, t);

        if (frame!.transparentVideoUrl) {
          expect(html).toContain(`data-mascot-video-time="${frame!.seekTimeSeconds}"`);
          expect(html).toContain(`data-mascot-animation-frame="${frame!.animationFrameIndex}"`);
        }
      }
    });

    it("records transparent video metadata into render snapshot for bit-for-bit replay", () => {
      const snapshot = createMascotAnimationRenderSnapshot("video-webm-202");
      const adapted = adaptMascotForQuestion(videoAnimatedMascot, "style-academic", 0, {
        videoId: "video-webm-202",
        questionId: "q-webm-1",
        snapshot,
      });

      expect(adapted).toBeDefined();
      expect(snapshot.entries.length).toBe(2);
      const thinkingEntry = findSnapshotEntry(snapshot, {
        videoId: "video-webm-202",
        questionId: "q-webm-1",
        state: "thinking",
        styleId: "style-academic",
      });
      expect(thinkingEntry).toBeDefined();
      expect(thinkingEntry!.transparent_video_url).toBe("/mascot/assets/owl/thinking/video_transparent.webm");
      expect(thinkingEntry!.alpha_codec).toBe("vp9_alpha");
    });
  });

  describe("Production Video Rendering Pipeline & Multi-Question Randomization (Phase 4)", () => {
    function createMultiQuestionQuiz(count = 5) {
      return QuizV2Schema.parse({
        schema_version: 2,
        episode_id: "ep-phase4-video-pipeline",
        age_band: "7-9",
        language: "English",
        questions: Array.from({ length: count }, (_, i) => ({
          id: `q-p4-0${i + 1}`,
          number: i + 1,
          format: "multiple_choice",
          difficulty: 1,
          question: `Sample Question ${i + 1}?`,
          choices: [
            { id: "c1", text: "Choice 1" },
            { id: "c2", text: "Choice 2" },
            { id: "c3", text: "Choice 3" },
          ],
          correct_choice_id: "c1",
          explanation: `Explanation for question ${i + 1}`,
          fun_fact: `Fun fact for question ${i + 1}`,
          source_ids: [`S${i + 1}`],
          visual_opportunity: `Scene ${i + 1}`,
          validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
        })),
      });
    }

    const multiSlotProductionMascot: MascotProfile = {
      id: "owl-production-multi",
      name: "Professor Owl Multi-Slot",
      description: "Owl with mixed WebM video (Slot 2) and static 3D characters across slots",
      visual_style: "pixar_3d",
      master_prompt: "A scholarly owl in 3D pixar style",
      master_image_url: "/mascot/assets/owl/master.png",
      color_theme: "#4f46e5",
      assigned_channel_ids: [],
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      actions: {
        idle: {
          action: "idle",
          sprite_url: "/mascot/assets/owl/idle.png",
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
        },
      },
      styles: [
        {
          id: "core",
          name: "Core Style",
          keyword: "core",
          anchor_image_url: "/mascot/assets/owl/anchor.png",
          is_default: true,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
          states: {
            thinking: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: "/mascot/assets/owl/thinking_slot1_still.png",
                status: "ready",
                motion_preset: "sway",
                motion_speed: 1.0,
                motion_intensity: "normal",
              },
              {
                id: "slot_2",
                slot_index: 2,
                image_url: "/mascot/assets/owl/thinking_slot2_preview.png",
                status: "ready",
                animation: createVideoAnimationAsset("thinking", true, 8000, 24),
              },
              {
                id: "slot_3",
                slot_index: 3,
                image_url: "/mascot/assets/owl/thinking_slot3_still.png",
                status: "ready",
                motion_preset: "pulse",
                motion_speed: 1.2,
                motion_intensity: "dynamic",
              },
              {
                id: "slot_4",
                slot_index: 4,
                image_url: "/mascot/assets/owl/thinking_slot4_still.png",
                status: "ready",
                motion_preset: "float",
                motion_speed: 0.8,
                motion_intensity: "subtle",
              },
            ],
            celebrate: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: "/mascot/assets/owl/celebrate_slot1_still.png",
                status: "ready",
                motion_preset: "jump",
                motion_speed: 1.0,
                motion_intensity: "normal",
              },
              {
                id: "slot_2",
                slot_index: 2,
                image_url: "/mascot/assets/owl/celebrate_slot2_still.png",
                status: "ready",
                motion_preset: "wave",
                motion_speed: 1.2,
                motion_intensity: "dynamic",
              },
            ],
          },
        },
        {
          id: "police",
          name: "Police Style",
          keyword: "police",
          anchor_image_url: null,
          is_default: false,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
          states: {
            thinking: [
              {
                id: "police_t1",
                slot_index: 1,
                image_url: "/mascot/assets/owl/police_thinking_slot1.png",
                status: "ready",
                motion_preset: "sway",
              },
            ],
            celebrate: [],
          },
        },
      ],
    };

    it("multi-question composition executes randomized selector with repeat avoidance across questions", () => {
      const quiz = createMultiQuestionQuiz(5);
      const director = createDefaultDirectorPlan(quiz);
      const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });

      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: multiSlotProductionMascot,
        mascotConfig: channelConfig,
      });

      expect(bundle.mascotAnimationSnapshot).toBeDefined();
      const snapshot = bundle.mascotAnimationSnapshot!;
      expect(snapshot.entries.length).toBe(10);

      const thinkingSlots: number[] = [];
      const celebrateSlots: number[] = [];

      for (let i = 1; i <= 5; i++) {
        const thinkingEntry = findSnapshotEntry(snapshot, {
          videoId: quiz.episode_id,
          questionId: `q-p4-0${i}`,
          state: "thinking",
          styleId: "core",
        });
        expect(thinkingEntry).toBeDefined();
        thinkingSlots.push(thinkingEntry!.slot_index);

        const celebrateEntry = findSnapshotEntry(snapshot, {
          videoId: quiz.episode_id,
          questionId: `q-p4-0${i}`,
          state: "celebrate",
          styleId: "core",
        });
        expect(celebrateEntry).toBeDefined();
        celebrateSlots.push(celebrateEntry!.slot_index);
      }

      // 1. Repeat avoidance: adjacent questions must NEVER repeat the same slot
      for (let i = 0; i < thinkingSlots.length - 1; i++) {
        expect(thinkingSlots[i]).not.toBe(thinkingSlots[i + 1]);
      }
      for (let i = 0; i < celebrateSlots.length - 1; i++) {
        expect(celebrateSlots[i]).not.toBe(celebrateSlots[i + 1]);
      }

      // 2. Diversity: across 5 questions with 4 available thinking slots, at least 2 distinct slots chosen
      const uniqueThinking = new Set(thinkingSlots);
      expect(uniqueThinking.size).toBeGreaterThanOrEqual(2);

      // 3. Re-rendering with persisted snapshot yields bit-for-bit identical composition
      const reRenderBundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: multiSlotProductionMascot,
        mascotConfig: channelConfig,
        mascotAnimationSnapshot: snapshot,
      });
      expect(reRenderBundle.html).toBe(bundle.html);
      for (const [key, content] of Object.entries(bundle.files)) {
        expect(reRenderBundle.files[key]).toBe(content);
      }
    });

    it("renders transparent WebM video element for video-enabled slots and img element with CSS keyframes for static slots", () => {
      const quiz = createMultiQuestionQuiz(5);
      const director = createDefaultDirectorPlan(quiz);
      const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });

      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: multiSlotProductionMascot,
        mascotConfig: channelConfig,
      });

      const snapshot = bundle.mascotAnimationSnapshot!;

      for (let i = 1; i <= 5; i++) {
        const qKey = Object.keys(bundle.files).find((k) => k.startsWith(`compositions/quiz-q${i}-`));
        expect(qKey).toBeDefined();
        const html = bundle.files[qKey!];

        const thinkingEntry = findSnapshotEntry(snapshot, {
          videoId: quiz.episode_id,
          questionId: `q-p4-0${i}`,
          state: "thinking",
          styleId: "core",
        });
        expect(thinkingEntry).toBeDefined();

        if (thinkingEntry!.slot_index === 2) {
          // Slot 2 has transparent WebM video
          expect(html).toContain("<video");
          expect(html).toContain('class="mascot-v2-frame mascot-v2-animation-art mascot-v2-animation-video"');
          expect(html).toContain("video_transparent.webm");
          expect(html).toContain("data-mascot-animation-video=");
          expect(html).toContain('data-mascot-video-cycle="8"');
        } else {
          // Static slots render img element with CSS motion keyframes
          expect(html).toContain("<img");
          expect(html).toContain('class="mascot-v2-frame mascot-v2-image"');
          expect(html).toContain("data-mascot-image=");
          expect(html).toContain("data-mascot-motion-preset=");
        }
      }

      // Direct verification of timeline seek resolver on Slot 2 (video)
      const adaptedSlot2 = adaptMascotForQuestion(multiSlotProductionMascot, "core", 0, {
        videoId: "direct_slot2_test",
        questionId: "q_force_slot2",
        snapshot: {
          version: 1,
          video_id: "direct_slot2_test",
          created_at: new Date().toISOString(),
          entries: [
            {
              videoId: "direct_slot2_test",
              questionId: "q_force_slot2",
              state: "thinking",
              styleId: "core",
              slot_index: 2,
            },
          ],
        },
      });

      const bundleSlot2 = adaptMascotV1ToV2(adaptedSlot2, channelConfig);
      expect(bundleSlot2).toBeDefined();

      const options: ProductionMascotRenderOptions = {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
        timelineEvents: [
          { type: "choices.enter", at_seconds: 2.0 },
          { type: "countdown.start", at_seconds: 3.0 },
          { type: "answer.reveal", at_seconds: 8.0 },
        ],
      };

      // At 5.5s (2.5s into thinking):
      const frameAt5_5s = resolveProductionMascotTimelineAtTime(options, bundleSlot2!, 5.5);
      expect(frameAt5_5s).not.toBeNull();
      expect(frameAt5_5s!.transparentVideoUrl).toBe("/mascot/assets/owl/thinking/video_transparent.webm");
      expect(frameAt5_5s!.seekTimeSeconds).toBe(2.5);
    });

    it("omits mascot layer cleanly (null / invisible) for 0-variant states without breaking composition or timeline", () => {
      // 1. Direct timeline frame resolution for Police style (0 celebrate variants)
      const adaptedPolice = adaptMascotForQuestion(multiSlotProductionMascot, "police", 0);
      expect(adaptedPolice).toBeDefined();
      expect(adaptedPolice?.render_bundle?.assets.actions.thinking).toBeDefined();
      expect(adaptedPolice?.render_bundle?.assets.actions.celebrate).toBeUndefined();

      const policeRenderOptions: ProductionMascotRenderOptions = {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
        timelineEvents: [
          { type: "choices.enter", at_seconds: 2.0 },
          { type: "countdown.start", at_seconds: 3.0 },
          { type: "answer.reveal", at_seconds: 7.0 },
        ],
        revealOutcome: "correct",
        styleId: "police",
      };

      // In thinking phase (3.5s): thinking frame is present
      const policeBundle = resolveEffectiveRenderBundle(adaptedPolice, channelConfig);
      expect(policeBundle).toBeDefined();
      synchronizeBundleVisibility(policeBundle!, adaptedPolice);

      const thinkingFrame = resolveProductionMascotTimelineAtTime(policeRenderOptions, policeBundle!, 3.5);
      expect(thinkingFrame).not.toBeNull();
      expect(thinkingFrame?.phase).toBe("thinking");
      expect(thinkingFrame?.action).toBe("thinking");

      // In reveal / celebrate phase (7.5s): 0 celebrate variants -> produces null frame
      const celebrateFrame = resolveProductionMascotTimelineAtTime(policeRenderOptions, policeBundle!, 7.5);
      expect(celebrateFrame).toBeNull();

      // At render time: thinking renders HTML layer, celebrate renders empty string
      const thinkingHtml = renderProductionMascotAtTime(multiSlotProductionMascot, channelConfig, policeRenderOptions, 3.5);
      expect(thinkingHtml.length).toBeGreaterThan(0);
      expect(thinkingHtml).toContain('data-mascot-phase="thinking"');
      expect(thinkingHtml).toContain("/mascot/assets/owl/police_thinking_slot1.png");

      const celebrateHtml = renderProductionMascotAtTime(multiSlotProductionMascot, channelConfig, policeRenderOptions, 7.5);
      expect(celebrateHtml).toBe("");

      // 2. Full 5-question composition with Police style
      const quiz = createMultiQuestionQuiz(5);
      const director = createDefaultDirectorPlan(quiz);
      const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });

      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: multiSlotProductionMascot,
        mascotConfig: channelConfig,
        mascotStyleId: "police",
      });

      // Composition duration and scenes are completely intact
      expect(bundle.html).toContain('data-composition-id="quiz-v2-candy-arcade"');
      expect(bundle.html).toContain(`data-duration="${timeline.duration_seconds.toFixed(3)}"`);
      expect(Object.keys(bundle.files).length).toBeGreaterThanOrEqual(5);

      // Question clips contain thinking mascot layer but omit celebrate state cleanly
      for (let i = 1; i <= 5; i++) {
        const qKey = Object.keys(bundle.files).find((k) => k.startsWith(`compositions/quiz-q${i}-`));
        expect(qKey).toBeDefined();
        const html = bundle.files[qKey!];
        expect(html).toContain('data-mascot-phase="thinking"');
        expect(html).toContain("/mascot/assets/owl/police_thinking_slot1.png");
        expect(html).not.toContain('data-mascot-phase="reveal"');
        expect(html).not.toContain("state-celebrate");
      }
    });
  });
});
