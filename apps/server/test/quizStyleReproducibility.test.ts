import { describe, expect, it } from "vitest";
import { buildQuizRenderStyleContext } from "../src/quiz/render/quizRenderStyleContext.js";

describe("quiz style reproducibility", () => {
  it("carries catalog and preset revisions into render context", () => {
    const channel = {
      channel_id: "channel-1",
      slug: "channel-1",
      display_name: "Channel",
      description: "",
      target_audience: "",
      language: "English",
      country: "GLOBAL",
      market: "",
      channel_dna_path: "dna.md",
      style_guide_path: null,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      episode_count: 0,
      voice_reference_path: null,
      selected_styles: ["pixar_3d"],
      mascot_id: null,
      mascot_config: { enabled: true, position: "bottom_left", scale: 1 },
      default_palette_id: "auto",
      default_thinking_bar_style: "auto",
      default_question_box_style: "auto",
      default_answer_card_style: "auto",
      default_counter_style: "auto",
      default_background_style: "auto",
    } as never;
    const context = buildQuizRenderStyleContext(channel, {
      style_catalog_revision: "catalog-old",
      style_preset_revision: 3,
    } as never);
    expect(context.styleCatalogRevision).toBe("catalog-old");
    expect(context.stylePresetRevision).toBe(3);
  });
});
