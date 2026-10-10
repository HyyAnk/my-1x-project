import { describe, expect, it } from "vitest";
import type { VideoDescription } from "@studio/shared";
import { extractScoringBlock } from "./descriptionBlocks";

const baseDescription: VideoDescription = {
  topic_category: "Space",
  primary_keyword: "space quiz",
  keyword_variations: [],
  question_count: 3,
  hook_lines: "Hook",
  semantic_paragraph: "Paragraph",
  scoring_cta: { beginner: "0–1 puntos: A", intermediate: "2 puntos: B", expert: "3 puntos: C", cta_text: "CTA" },
  suggested_playlist_category: "Space",
  hashtags: ["#quiz"],
  full_description_text: "Hook\n\nParagraph\n\n🏆 NIVELES DE PUNTUACIÓN:\n• 0–1 puntos: A\n• 2 puntos: B\n• 3 puntos: C\n👉 CTA\n\n#quiz",
  char_count: 0,
  language: "es",
  generated_at: "2026-10-10T00:00:00.000Z",
};

describe("extractScoringBlock", () => {
  it("copies the localized scoring block exactly as published", () => {
    expect(extractScoringBlock(baseDescription)).toBe("🏆 NIVELES DE PUNTUACIÓN:\n• 0–1 puntos: A\n• 2 puntos: B\n• 3 puntos: C\n👉 CTA");
  });

  it("falls back to the default layout when the text was edited by hand", () => {
    const edited = { ...baseDescription, full_description_text: "Custom text\n\n#quiz" };
    expect(extractScoringBlock(edited)).toBe("🏆 SCORING TIERS:\n• 0–1 puntos: A\n• 2 puntos: B\n• 3 puntos: C\n👉 CTA");
  });
});
