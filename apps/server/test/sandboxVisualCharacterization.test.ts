import { describe, expect, it } from "vitest";
import type { MascotProfile, QuizAnswerCardStyle, QuizPreviewLayoutId } from "@studio/shared";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

const mascot: MascotProfile = {
  id: "phase-01-mascot",
  name: "Baseline Mascot",
  description: "Deterministic characterization fixture",
  visual_style: "pixar_3d",
  master_prompt: "A friendly mascot",
  master_image_url: "/phase-01-mascot.png",
  color_theme: "#06b6d4",
  actions: {},
  assigned_channel_ids: [],
  created_at: "2026-08-31T00:00:00.000Z",
  updated_at: "2026-08-31T00:00:00.000Z",
};

function renderedBody(html: string): string {
  return html.slice(html.indexOf("<body>"));
}

describe("Phase 1 Sandbox phase and skin characterization", () => {
  it("P-01 through P-04 preserve question, choices, thinking, reveal, and explain states", () => {
    const question = buildSandboxComposition({ phase: "question" }).html;
    expect(question).toContain('class="answer-grid answer-count-3" style="opacity:0;"');

    for (const phase of ["choices", "thinking"] as const) {
      const html = buildSandboxComposition({ phase }).html;
      expect(html).toContain('class="answer-grid answer-count-3" style="opacity:1;"');
      expect(html).toContain("answer-normal");
      expect(html).toContain("thinking-bar");
    }

    const reveal = buildSandboxComposition({ phase: "reveal", correct_choice_index: 1 }).html;
    expect(reveal).toContain("answer-correct");
    expect(reveal).toContain("answer-incorrect");

    const explain = buildSandboxComposition({ phase: "explain", fact_card_text: "Deterministic fact" }).html;
    expect(explain).toContain("answer-correct");
    expect(explain).toContain("answer-incorrect");
    expect(explain).toContain("sandbox-explain-card");
    expect(explain).toContain("Deterministic fact");
  });

  it("C-04 and C-05 preserve selected text skins and skin-independent visual choices", () => {
    const text = renderedBody(
      buildSandboxComposition({
        layout_id: "media_left_choices_right",
        answer_card_style: "comic_chunky",
        phase: "reveal",
      }).html,
    );
    expect(text).toContain("ac-comic-chunky");

    const visual = renderedBody(
      buildSandboxComposition({
        layout_id: "visual_choices_three",
        answer_card_style: "comic_chunky",
        phase: "reveal",
      }).html,
    );
    expect(visual).toContain("visual-answer-card answer-correct");
    expect(visual).not.toContain("ac-comic-chunky");
  });
});

type PairwiseCase = {
  id: string;
  layout: QuizPreviewLayoutId;
  skin: QuizAnswerCardStyle;
  phase: "choices" | "thinking" | "reveal" | "explain";
  aspect: "16:9" | "9:16";
  mascotPosition?: "bottom_left" | "bottom_right";
};

const pairwiseCases: PairwiseCase[] = [
  { id: "PW-01", layout: "media_left_choices_right", skin: "glossy_arcade", phase: "choices", aspect: "16:9" },
  {
    id: "PW-02",
    layout: "media_left_choices_right",
    skin: "comic_chunky",
    phase: "reveal",
    aspect: "16:9",
    mascotPosition: "bottom_left",
  },
  {
    id: "PW-03",
    layout: "media_left_choices_right",
    skin: "glass_neon",
    phase: "explain",
    aspect: "9:16",
    mascotPosition: "bottom_right",
  },
  { id: "PW-04", layout: "media_left_choices_right", skin: "minimal_soft", phase: "thinking", aspect: "9:16" },
  { id: "PW-05", layout: "visual_choices_three", skin: "glossy_arcade", phase: "choices", aspect: "16:9" },
  {
    id: "PW-06",
    layout: "visual_choices_three",
    skin: "comic_chunky",
    phase: "reveal",
    aspect: "9:16",
    mascotPosition: "bottom_left",
  },
];

describe("Phase 1 minimum pairwise render baseline", () => {
  it.each(pairwiseCases)("$id renders the current structural contract", (entry) => {
    const hasMascot = Boolean(entry.mascotPosition);
    const result = buildSandboxComposition(
      {
        layout_id: entry.layout,
        answer_card_style: entry.skin,
        phase: entry.phase,
        aspect_ratio: entry.aspect,
        mascot_id: hasMascot ? mascot.id : null,
        mascot_enabled: hasMascot,
        mascot_position: entry.mascotPosition,
      },
      hasMascot ? mascot : null,
    );
    const body = renderedBody(result.html);

    expect(body).toContain(`layout-${entry.layout}`);
    expect(body).toContain(`data-aspect-ratio="${entry.aspect}"`);
    expect(body.includes(" has-mascot sandbox-preview-stage")).toBe(hasMascot);
    if (entry.mascotPosition) expect(body).toContain(`anchor-${entry.mascotPosition}`);

    if (entry.layout === "visual_choices_three") {
      expect(body).toContain("visual-answer-card");
      expect(body).not.toMatch(/\bac-(glossy-arcade|comic-chunky|glass-neon|minimal-soft)\b/);
    } else if (entry.skin === "glossy_arcade") {
      expect(body).toContain("ac-glossy-arcade");
    } else {
      expect(body).toContain(`ac-${entry.skin.replaceAll("_", "-")}`);
    }
  });
});
