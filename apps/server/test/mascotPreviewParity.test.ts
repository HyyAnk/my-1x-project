import { describe, expect, it } from "vitest";
import type { ChannelMascotConfig, MascotProfile } from "@studio/shared";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { renderProductionMascotHtmlLayer } from "../src/quiz/render/productionMascotRenderer.js";

const mascot: MascotProfile = {
  id: "parity-mascot",
  name: "Parity Mascot",
  description: "Preview parity fixture",
  visual_style: "pixar_3d",
  master_prompt: "Preview parity fixture",
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
      offset_x: 14,
      offset_y: -6,
      motion_preset: "sway",
      motion_speed: 1.25,
      motion_intensity: "dynamic",
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-08-29T00:00:00.000Z",
  updated_at: "2026-08-29T00:00:00.000Z",
};

const config: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_right",
  scale: 1.84,
  offset_x: 21,
  offset_y: 90,
  flip_x: true,
  show_in_intro: false,
  show_in_outro: false,
  show_in_question: true,
};

describe("Mascot preview/editor parity", () => {
  it("serializes the same canonical placement, asset registration, and motion as production", () => {
    const preview = buildSandboxComposition(
      {
        mascot_id: mascot.id,
        mascot_enabled: true,
        mascot_action: "thinking",
        mascot_position: config.position,
        mascot_scale: config.scale,
        mascot_offset_x: config.offset_x,
        mascot_offset_y: config.offset_y,
        mascot_flip_x: config.flip_x,
        mascot_phase: "thinking",
        mascot_timeline_time_seconds: 5,
      },
      mascot,
    ).html;
    const production = renderProductionMascotHtmlLayer(mascot, config, {
      phase: "question",
      clipStartSeconds: 5,
      clipDurationSeconds: 3,
      timelineEvents: [{ type: "countdown.start", at_seconds: 5 }],
    });

    for (const token of [
      'data-mascot-contract-version="2"',
      'data-mascot-canvas="1920x1080"',
      'data-mascot-anchor="bottom_right"',
      'data-mascot-scale="1.84"',
      'data-mascot-offset-x="21"',
      'data-mascot-offset-y="90"',
      'data-mascot-flip-x="true"',
      'data-mascot-asset-action="thinking"',
      'data-mascot-registration-offset="14,-6"',
      'data-mascot-motion-preset="sway"',
      'data-mascot-motion-speed="1.25"',
      'data-mascot-motion-intensity="dynamic"',
    ]) {
      expect(preview).toContain(token);
      expect(production).toContain(token);
    }
  });

  it("applies phase visibility and stopped-preview state through the shared resolver", () => {
    const hidden = buildSandboxComposition(
      {
        mascot_id: mascot.id,
        mascot_enabled: true,
        mascot_action: "wave",
        mascot_phase: "intro",
        mascot_show_in_intro: false,
      },
      mascot,
    ).html;
    expect(hidden).not.toContain('data-mascot-contract-version="2"');

    const stopped = buildSandboxComposition(
      {
        mascot_id: mascot.id,
        mascot_enabled: true,
        mascot_action: "thinking",
        mascot_phase: "thinking",
        mascot_timeline_time_seconds: 5,
        mascot_playing: false,
      },
      mascot,
    ).html;
    expect(stopped).toContain('data-mascot-playing="false"');
    expect(stopped).toContain("--mascot-preview-transform:");
  });
});
