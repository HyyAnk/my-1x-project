import { describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import { renderProductionMascotHtmlLayer } from "../src/quiz/render/productionMascotRenderer.js";

const mascot: MascotProfile = {
  id: "production-mascot",
  name: "Production Mascot",
  description: "Renderer fixture",
  visual_style: "pixar_3d",
  master_prompt: "Renderer fixture",
  master_image_url: "/assets/master.png",
  color_theme: "#06b6d4",
  actions: {
    thinking: {
      action: "thinking",
      sprite_url: "/assets/thinking.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 12,
      offset_y: -8,
      motion_preset: "sway",
      motion_speed: 1.25,
      motion_intensity: "normal",
    },
    point: {
      action: "point",
      sprite_url: "/assets/point-strip.png",
      frames_count: 4,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: -4,
      offset_y: 3,
      motion_preset: "point",
      motion_speed: 0.9,
      motion_intensity: "dynamic",
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-08-29T00:00:00.000Z",
  updated_at: "2026-08-29T00:00:00.000Z",
};

const config = {
  enabled: true,
  mascot_media_mode: "animation" as const,
  position: "bottom_right" as const,
  scale: 1.84,
  offset_x: 21,
  offset_y: 90,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
};

describe("production mascot renderer", () => {
  it("serializes a canonical V2 question layer from timeline phases", () => {
    const html = renderProductionMascotHtmlLayer(mascot, config, {
      phase: "question",
      clipStartSeconds: 5,
      clipDurationSeconds: 12,
      timelineEvents: [
        { type: "choices.enter", at_seconds: 6, payload: {} },
        { type: "countdown.start", at_seconds: 7, payload: {} },
        { type: "answer.reveal", at_seconds: 10, payload: {} },
        { type: "mascot.state", at_seconds: 11, payload: { state: "point", phase: "explanation_start" } },
      ],
    });

    expect(html).toContain('data-mascot-contract-version="2"');
    expect(html).toContain('data-mascot-aspect-ratio="16:9"');
    expect(html).toContain('data-mascot-canvas="1920x1080"');
    expect(html).toContain("anchor-bottom_right");
    expect(html).toContain('data-mascot-scale="1.84"');
    expect(html).toContain('data-mascot-offset-x="21"');
    expect(html).toContain('data-mascot-offset-y="90"');
    expect(html).toContain('data-mascot-phase="reveal"');
    expect(html).toContain('data-mascot-phase="explain"');
    expect(html).toContain("--mascot-state-delay:5s");
    expect(html).toContain("--mascot-state-delay:10s");
    expect(html).toContain('data-mascot-action="point"');
    expect(html).toContain("--mascot-pivot-x:");
    expect(html).toContain("--mascot-registration-x:12px");
    expect(html).toContain("--mascot-motion-speed:1.25");
    expect(html).toContain('data-legacy-class="mascot-state-layer"');
    expect(html).toContain("--mascot-art-url:url('/assets/thinking.png')");
    expect(html).not.toContain('style="--mascot-art-url:url("');
  });

  it("keeps legacy frame-strip assets renderable as explicit compatibility metadata", () => {
    const html = renderProductionMascotHtmlLayer(mascot, config, {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 4,
      timelineEvents: [{ type: "mascot.state", at_seconds: 1, payload: { state: "encourage" } }],
    });

    expect(html).toContain('data-mascot-legacy-frames="4"');
    expect(html).toContain('data-mascot-legacy-fps="8"');
    expect(html).toContain("--mascot-legacy-frames:4");
    expect(html).toContain("mascot-v2-legacy-frame");
    expect(html).not.toContain("repeat:-1");
  });

  it("uses the resolver fallback asset and preserves intro visibility policy", () => {
    const html = renderProductionMascotHtmlLayer(
      { ...mascot, actions: {} },
      { ...config, show_in_intro: false },
      { phase: "intro", clipStartSeconds: 0, clipDurationSeconds: 2 },
    );
    expect(html).toBe("");

    const fallback = renderProductionMascotHtmlLayer({ ...mascot, actions: { thinking: mascot.actions.thinking } }, config, {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 3,
      timelineEvents: [{ type: "answer.reveal", at_seconds: 1, payload: {} }],
    });
    expect(fallback).toContain('data-mascot-action="thinking"');
    expect(fallback).toContain("/assets/thinking.png");
  });

  it("transitions to point on fact.enter at explanation timestamp without explicit mascot.state override", () => {
    const html = renderProductionMascotHtmlLayer(mascot, config, {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 10,
      timelineEvents: [
        { type: "choices.enter", at_seconds: 0.85 },
        { type: "countdown.start", at_seconds: 2.47 },
        { type: "answer.reveal", at_seconds: 7.47 },
        { type: "fact.enter", at_seconds: 8.27 },
      ],
    });

    expect(html).toContain('data-mascot-phase="explain"');
    expect(html).toContain('data-mascot-action="point"');
    expect(html).toContain("--mascot-state-delay:8.27s");
    expect(html).toContain("/assets/point-strip.png");
  });

  it("allows initial mascot action override at clipStartSeconds while preserving standard phase transitions", () => {
    const mascotWithWave = {
      ...mascot,
      actions: {
        ...mascot.actions,
        wave: {
          action: "wave" as const,
          sprite_url: "/assets/wave.png",
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
          motion_preset: "wave" as const,
          motion_speed: 1.0,
          motion_intensity: "normal" as const,
        },
      },
    };

    const html = renderProductionMascotHtmlLayer(mascotWithWave, config, {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 10,
      timelineEvents: [
        { type: "choices.enter", at_seconds: 0.85 },
        { type: "countdown.start", at_seconds: 2.47 },
        { type: "answer.reveal", at_seconds: 7.47 },
        { type: "fact.enter", at_seconds: 8.27 },
        { type: "mascot.state", at_seconds: 0, payload: { state: "wave" } },
      ],
    });

    // Initial state layer at 0s should be the action override "wave"
    expect(html).toContain('class="mascot-v2-state state-wave"');
    expect(html).toContain("--mascot-state-delay:0s");
    expect(html).toContain('data-mascot-action="wave"');

    // Subsequent layers preserve standard transitions
    expect(html).toContain('data-mascot-phase="choices"');
    expect(html).toContain("--mascot-state-delay:0.85s");
    expect(html).toContain('data-mascot-phase="thinking"');
    expect(html).toContain("--mascot-state-delay:2.47s");
    expect(html).toContain('data-mascot-phase="reveal"');
    expect(html).toContain("--mascot-state-delay:7.47s");
    expect(html).toContain('data-mascot-phase="explain"');
    expect(html).toContain("--mascot-state-delay:8.27s");
  });

  it("consolidates contiguous transparent video animation states to eliminate frame jumping", () => {
    function createVideoAnimationAsset(state: "thinking" | "celebrate", loop: boolean, durationMs = 8000, fps = 24) {
      const frameCount = Math.round((durationMs / 1000) * fps);
      return {
        version: 1 as const,
        state,
        atlas_url: "",
        manifest_url: `/mascot/assets/owl/${state}/manifest.json`,
        transparent_video_url: `/assets/${state}.webm`,
        alpha_codec: "vp9_alpha" as const,
        duration_ms: durationMs,
        frame_count: frameCount,
        fps,
        loop,
        loop_policy: (loop ? "loop" : "one_shot_rest") as "loop" | "one_shot_rest",
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
          content_bounds: { x: 0, y: 0, width: 512, height: 512 },
          pivot: { x: 256, y: 512 },
          offset_x: 0,
          offset_y: 0,
        },
        content_fingerprint: `content-${state}-hash-video`,
        source_fingerprint: `source-${state}-hash-video`,
        slot_index: state === "thinking" ? 9 : 5,
        recipe_id: `${state}-01-video`,
      };
    }

    const videoMascot: MascotProfile = {
      id: "seamless-video-mascot",
      name: "Seamless Video Mascot",
      description: "Video loop fixture",
      visual_style: "pixar_3d",
      master_prompt: "Video loop fixture",
      master_image_url: "/assets/master.png",
      color_theme: "#06b6d4",
      actions: {},
      styles: [
        {
          id: "style-default",
          name: "Default Style",
          keyword: "default",
          anchor_image_url: "/assets/master.png",
          is_default: true,
          created_at: "2026-08-29T00:00:00.000Z",
          updated_at: "2026-08-29T00:00:00.000Z",
          states: {
            thinking: [
              {
                id: "owl-thinking-video",
                slot_index: 9,
                image_url: "/assets/thinking.webm",
                status: "ready",
                animation: createVideoAnimationAsset("thinking", true, 8000, 24),
              },
            ],
            celebrate: [
              {
                id: "owl-celebrate-video",
                slot_index: 5,
                image_url: "/assets/celebrate.webm",
                status: "ready",
                animation: createVideoAnimationAsset("celebrate", false, 8000, 24),
              },
            ],
          },
        },
      ],
      assigned_channel_ids: [],
      created_at: "2026-08-29T00:00:00.000Z",
      updated_at: "2026-08-29T00:00:00.000Z",
    };

    const html = renderProductionMascotHtmlLayer(videoMascot, config, {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 23.32,
      timelineEvents: [
        { type: "choices.enter", at_seconds: 0.48 },
        { type: "countdown.start", at_seconds: 9.4 },
        { type: "mascot.state", at_seconds: 10.9, payload: { state: "thinking" } },
        { type: "answer.reveal", at_seconds: 15.45 },
        { type: "mascot.state", at_seconds: 16.03, payload: { state: "celebrate" } },
        { type: "fact.enter", at_seconds: 18.14 },
      ],
    });

    // Count video elements
    const videoMatches = html.match(/<video\b/g);
    // Exactly 2 video elements: 1 continuous thinking, 1 continuous celebrate
    expect(videoMatches?.length).toBe(2);

    // Thinking starts at 0s and spans until answer.reveal at 15.45s
    expect(html).toContain('id="mascot-video-thinking-9-0"');
    expect(html).toContain('data-start="0"');
    expect(html).toContain('data-duration="15.45"');

    // Celebrate starts at 15.45s and spans until end (23.32s - 15.45s = 7.87s)
    expect(html).toContain('id="mascot-video-celebrate-5-15450"');
    expect(html).toContain('data-start="15.45"');
    expect(html).toContain('data-duration="7.87"');
  });
});
