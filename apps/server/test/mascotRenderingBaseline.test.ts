import { describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";

const BASELINE_MASCOT: MascotProfile = {
  id: "baseline-mascot",
  name: "Baseline Mascot",
  description: "Baseline fixture",
  visual_style: "pixar_3d",
  master_prompt: "Baseline fixture",
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
      offset_x: 0,
      offset_y: 0,
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-08-29T00:00:00.000Z",
  updated_at: "2026-08-29T00:00:00.000Z",
};

describe("current mascot rendering baseline", () => {
  it("preserves the production scale value in the Sandbox composition", () => {
    const result = buildSandboxComposition(
      {
        mascot_id: "baseline-mascot",
        mascot_enabled: true,
        mascot_action: "thinking",
        mascot_position: "bottom_left",
        mascot_scale: 1.84,
        mascot_offset_x: 21,
        mascot_offset_y: 90,
      },
      BASELINE_MASCOT,
    );

    expect(result.html).toContain("--mascot-scale:1.84");
    expect(result.html).not.toContain("stage_preview_layout_only");
  });

  it("keeps the current 220px production mascot box as a characterization point", () => {
    const css = candyArcadeCss();

    expect(css).toContain(".candy-mascot-container { position: absolute; width: 220px; height: 220px;");
    expect(css).toContain(".candy-mascot-sprite { width: 220px; height: 220px;");
  });

  it("documents that the current renderer still accepts legacy multi-frame metadata", () => {
    const result = buildSandboxComposition(
      {
        mascot_id: "baseline-mascot",
        mascot_enabled: true,
        mascot_action: "thinking",
        mascot_position: "bottom_left",
        mascot_scale: 1,
      },
      {
        ...BASELINE_MASCOT,
        actions: {
          thinking: {
            action: "thinking",
            sprite_url: "/assets/thinking-strip.png",
            frames_count: 4,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
          },
        },
        assigned_channel_ids: [],
        created_at: "2026-08-29T00:00:00.000Z",
        updated_at: "2026-08-29T00:00:00.000Z",
      },
    );

    expect(result.html).toContain("--mascot-frames:4");
  });
});
