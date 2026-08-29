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
});
