import { describe, expect, it } from "vitest";
import {
  DEFAULT_MASCOT_PHASE_RULES,
  DEFAULT_MASCOT_REVEAL_OUTCOME_ACTIONS,
  MASCOT_DEFAULT_PLACEMENT,
  MascotRenderConfigV2Schema,
  MascotRenderContextSchema,
  MascotRenderSpecV2Schema,
} from "@studio/shared";

const placement = { ...MASCOT_DEFAULT_PLACEMENT };

const asset = {
  version: 2 as const,
  action: "thinking" as const,
  image_url: "/api/mascots/fixture/assets/thinking.png",
  registration: {
    source_width: 512,
    source_height: 512,
    content_bounds: { x: 48, y: 24, width: 416, height: 464 },
    pivot: { x: 256, y: 488 },
    offset_x: 0,
    offset_y: 0,
  },
  motion: { preset: "sway" as const, speed: 1.2, intensity: "normal" as const },
};

describe("MascotRenderContract V2", () => {
  it("parses a complete, aspect-aware render config", () => {
    const config = MascotRenderConfigV2Schema.parse({
      version: 2,
      placements: { "16:9": placement, "9:16": { ...placement, anchor: "bottom_right" } },
      visibility: {
        enabled: true,
        phase_rules: DEFAULT_MASCOT_PHASE_RULES,
        reveal_outcome_actions: DEFAULT_MASCOT_REVEAL_OUTCOME_ACTIONS,
      },
    });

    expect(config.version).toBe(2);
    expect(config.placements["16:9"].scale).toBe(1);
    expect(config.placements["9:16"].anchor).toBe("bottom_right");
    expect(config.visibility.phase_rules.explain.action).toBe("point");
  });

  it("rejects placement values outside the contract range", () => {
    expect(() =>
      MascotRenderConfigV2Schema.parse({
        version: 2,
        placements: {
          "16:9": { ...placement, scale: 0.29 },
          "9:16": placement,
        },
        visibility: {
          enabled: true,
          phase_rules: DEFAULT_MASCOT_PHASE_RULES,
          reveal_outcome_actions: DEFAULT_MASCOT_REVEAL_OUTCOME_ACTIONS,
        },
      }),
    ).toThrow();
  });

  it("keeps render context and resolved spec framework-independent", () => {
    const context = MascotRenderContextSchema.parse({
      aspect_ratio: "16:9",
      phase: "thinking",
      reveal_outcome: null,
      timeline_time_seconds: 4.5,
      playing: true,
    });
    const spec = MascotRenderSpecV2Schema.parse({
      version: 2,
      canvas: { width: 1920, height: 1080 },
      phase: context.phase,
      reveal_outcome: context.reveal_outcome,
      visible: true,
      placement,
      asset,
      motion: asset.motion,
      timeline_time_seconds: context.timeline_time_seconds,
      playing: context.playing,
    });

    expect(spec.canvas).toEqual({ width: 1920, height: 1080 });
    expect(spec.asset.registration.pivot).toEqual({ x: 256, y: 488 });
    expect(spec.motion.preset).toBe("sway");
  });
});
