import { describe, expect, it } from "vitest";
import { ALL_ANSWER_CARD_STYLES } from "@studio/shared";
import { renderChoiceGroup } from "../src/quiz/render/choices/renderChoiceGroup.js";
import type { ChoiceGroupRenderInput } from "../src/quiz/render/choices/choiceGroup.types.js";
import type { QuizSceneChoice } from "../src/quiz/render/scene/quizScene.types.js";
import { answerCardRegistry } from "../src/quiz/visual/elements/answerCard/registry.js";

describe("Phase 4 semantic choice-group renderer", () => {
  it("P4-SEM-01 and P4-SEM-02 order by normalized order and resolve correctness by canonical ID", () => {
    const html = renderChoiceGroup(
      choiceInput({
        phase: "reveal",
        items: [choice("choice-c", 2, "Gamma"), choice("choice-a", 0, "Alpha"), choice("choice-b", 1, "Beta")],
        correctChoiceId: "choice-a",
      }),
    );

    expect(html.indexOf('data-choice-id="choice-a"')).toBeLessThan(html.indexOf('data-choice-id="choice-b"'));
    expect(html.indexOf('data-choice-id="choice-b"')).toBeLessThan(html.indexOf('data-choice-id="choice-c"'));
    expect(choiceAttribute(html, "choice-a", "data-choice-label")).toBe("A");
    expect(choiceAttribute(html, "choice-b", "data-choice-label")).toBe("B");
    expect(choiceAttribute(html, "choice-c", "data-choice-label")).toBe("C");
    expect(choiceAttribute(html, "choice-a", "data-answer-state")).toBe("correct");
    expect(choiceAttribute(html, "choice-b", "data-answer-state")).toBe("incorrect");
  });

  it("P4-SEM-03 and P4-SEM-04 emit pending before reveal and one canonical result per choice after reveal", () => {
    for (const phase of ["question", "choices", "thinking"] as const) {
      const html = renderChoiceGroup(choiceInput({ phase }));
      expect(html.match(/data-answer-state="pending"/g)).toHaveLength(3);
      expect(html).not.toMatch(/data-answer-state="(?:correct|incorrect)"/);
    }

    for (const phase of ["reveal", "explain"] as const) {
      const html = renderChoiceGroup(choiceInput({ phase }));
      expect(html.match(/data-answer-state="correct"/g)).toHaveLength(1);
      expect(html.match(/data-answer-state="incorrect"/g)).toHaveLength(2);
    }
  });

  it("P4-SEM-05 escapes untrusted text, IDs, media sources, and accessible labels", () => {
    const unsafe = '<script data-x="1">alert(1)</script>';
    const html = renderChoiceGroup(
      choiceInput({
        presentation: "visual",
        items: [
          {
            ...choice('choice-" onmouseover="bad', 0, unsafe),
            media: { source: 'https://example.test/" onerror="bad', altText: unsafe, fallback: { subject: unsafe, seed: 1 } },
          },
          choice("choice-b", 1, "Beta"),
          choice("choice-c", 2, "Gamma"),
        ],
        correctChoiceId: 'choice-" onmouseover="bad',
      }),
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain('onmouseover="bad"');
    expect(html).not.toContain('onerror="bad"');
    expect(html).toContain("&lt;script");
    expect(html).toContain("&quot; onerror=&quot;bad");
  });

  it("P4-SEM-06 emits the established text tiers with mascot on and off", () => {
    expect(tierFor(19, false)).toBe("medium");
    expect(tierFor(35, false)).toBe("long");
    expect(tierFor(59, false)).toBe("very_long");
    expect(tierFor(83, false)).toBe("overflow");
    expect(tierFor(11, true)).toBe("medium");
    expect(tierFor(23, true)).toBe("long");
    expect(tierFor(41, true)).toBe("very_long");
    expect(tierFor(61, true)).toBe("overflow");
  });

  it("P4-SEM-07 uses a deterministic visual fallback without losing label or text", () => {
    const input = choiceInput({ presentation: "visual", phase: "reveal" });
    const first = renderChoiceGroup(input);
    const second = renderChoiceGroup(input);
    expect(first).toBe(second);
    expect(first.match(/data-media-fallback="true"/g)).toHaveLength(3);
    expect(first).toContain("data:image/svg+xml;base64,");
    expect(first).toContain('data-choice-label="A"');
    expect(first).toContain("Alpha");
  });

  it("P4-DOM-01 through P4-DOM-03 render two text, three text, and three visual choices", () => {
    const twoTextItems = [choice("choice-a", 0, "True"), choice("choice-b", 1, "False")];
    const twoText = renderChoiceGroup(choiceInput({ items: twoTextItems, correctChoiceId: "choice-a" }));
    const threeText = renderChoiceGroup(choiceInput());
    const threeVisual = renderChoiceGroup(choiceInput({ presentation: "visual" }));
    expect(twoText.match(/class="choice-card /g)).toHaveLength(2);
    expect(twoText).toContain("answer-count-2");
    expect(threeText.match(/class="choice-card /g)).toHaveLength(3);
    expect(threeVisual.match(/class="choice-media /g)).toHaveLength(3);
  });
});

describe("Phase 4 Answer Card skin contract", () => {
  it.each(ALL_ANSWER_CARD_STYLES.filter((style) => style !== "auto"))(
    "P4-SKIN-02 and P4-SKIN-03 render text and visual content with %s",
    (style) => {
      const skin = answerCardRegistry.get(style);
      if (!skin) throw new Error(`Missing test skin ${style}`);
      const text = renderChoiceGroup(choiceInput({ skin }));
      const visual = renderChoiceGroup(choiceInput({ skin, presentation: "visual" }));
      for (const html of [text, visual]) {
        expect(html.match(/class="choice-card /g)).toHaveLength(3);
        expect(html).toContain(`data-choice-skin="${style}"`);
        expect(html).toContain(skin.className);
      }
      expect(text).not.toContain("choice-media");
      expect(visual.match(/class="choice-media /g)).toHaveLength(3);
    },
  );
});

function choiceInput(overrides: Partial<ChoiceGroupRenderInput> = {}): ChoiceGroupRenderInput {
  const skin = answerCardRegistry.get("glossy_arcade");
  if (!skin) throw new Error("Missing glossy arcade test skin");
  return {
    questionId: "question-1",
    items: [choice("choice-a", 0, "Alpha"), choice("choice-b", 1, "Beta"), choice("choice-c", 2, "Gamma")],
    correctChoiceId: "choice-b",
    phase: "choices",
    visible: true,
    presentation: "text",
    skin,
    layoutId: "media_left_choices_right",
    hasMascot: false,
    ...overrides,
  };
}

function choice(id: string, order: number, text: string): QuizSceneChoice {
  return { id, order, text, media: { source: null, altText: text, fallback: { subject: text, seed: order + 1 } } };
}

function choiceAttribute(html: string, choiceId: string, attribute: string): string | undefined {
  const card = html.match(new RegExp(`<div[^>]*data-choice-id="${choiceId}"[^>]*>`))?.[0];
  return card?.match(new RegExp(`${attribute}="([^"]+)"`))?.[1];
}

function tierFor(length: number, hasMascot: boolean): string | undefined {
  const html = renderChoiceGroup(
    choiceInput({
      items: [choice("choice-a", 0, "x".repeat(length)), choice("choice-b", 1, "B")],
      correctChoiceId: "choice-a",
      hasMascot,
    }),
  );
  return html.match(/choice-tier-([a-z_]+)/)?.[1];
}
