import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateQuizLayoutCompatibility,
  preferredAutoLayout,
  resolveQuizLayout,
  LANDSCAPE_QUIZ_AUTO_CANDIDATES,
  PORTRAIT_QUIZ_AUTO_CANDIDATES,
  QUIZ_LAYOUT_CATALOG,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  type QuizPortraitLayoutId,
  type ResolvedQuizLayoutId,
} from "../src/index.js";

describe("9:16 portrait layout resolution policy", () => {
  it("resolves true/false format to portrait_verdict_tf", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "true_false",
      questionFormat: "true_false",
      choiceCount: 2,
      aspectRatio: "9:16",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "portrait_verdict_tf");
      assert.equal(result.source, "auto");
      assert.deepEqual(result.capability.supportedAspectRatios, ["9:16"]);
    }
  });

  it("resolves true/false archetype with multiple_choice format to portrait_verdict_tf if compatible or falls back gracefully", () => {
    const preferred = preferredAutoLayout("true_false", "true_false", { aspectRatio: "9:16", choiceCount: 2 });
    assert.equal(preferred, "portrait_verdict_tf");
  });

  it("resolves choiceCount: 2 to portrait_split_versus", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "text_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 2,
      aspectRatio: "9:16",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "portrait_split_versus");
      assert.equal(result.source, "auto");
      assert.deepEqual(result.capability.supportedAspectRatios, ["9:16"]);
    }
  });

  it("resolves versus_faceoff archetype to portrait_split_versus", () => {
    const preferred = preferredAutoLayout("versus_faceoff", "multiple_choice", {
      aspectRatio: "9:16",
      choiceCount: 2,
    });
    assert.equal(preferred, "portrait_split_versus");

    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "versus_faceoff",
      questionFormat: "multiple_choice",
      choiceCount: 2,
      aspectRatio: "9:16",
      choicePresentation: "visual",
      media: ["choice"],
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "portrait_split_versus");
    }
  });

  it("resolves question illustration media to portrait_hero_choices", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "illustrated_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 3,
      aspectRatio: "9:16",
      media: ["question"],
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "portrait_hero_choices");
      assert.equal(result.source, "auto");
      assert.deepEqual(result.capability.supportedAspectRatios, ["9:16"]);
    }
  });

  it("resolves image_guess format to portrait_hero_choices", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "image_guess",
      questionFormat: "image_guess",
      choiceCount: 3,
      aspectRatio: "9:16",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "portrait_hero_choices");
      assert.equal(result.source, "auto");
    }
  });

  it("strictly rejects odd_one_out format and visual_spotting in 9:16 vertical ratio", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "visual_spotting",
      questionFormat: "odd_one_out",
      choiceCount: 3,
      aspectRatio: "9:16",
      media: ["choice"],
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.issues[0]?.code, "layout_question_format_unsupported");
    }
  });

  it("resolves text-only multiple choice to portrait_stack_list", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "text_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 3,
      aspectRatio: "9:16",
      media: [],
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "portrait_stack_list");
      assert.equal(result.source, "auto");
      assert.deepEqual(result.capability.supportedAspectRatios, ["9:16"]);
    }
  });

  it("resolves 4-choice text question to portrait_stack_list", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "text_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 4,
      aspectRatio: "9:16",
      media: [],
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "portrait_stack_list");
      assert.equal(result.source, "auto");
    }
  });

  it("all 9:16 resolutions produce exclusively portrait layouts", () => {
    const testCases = [
      { archetype: "true_false", questionFormat: "true_false", choiceCount: 2 },
      { archetype: "text_multiple_choice", questionFormat: "multiple_choice", choiceCount: 2 },
      { archetype: "versus_faceoff", questionFormat: "multiple_choice", choiceCount: 2 },
      { archetype: "illustrated_multiple_choice", questionFormat: "multiple_choice", choiceCount: 3, media: ["question"] as const },
      { archetype: "image_guess", questionFormat: "image_guess", choiceCount: 3 },
      { archetype: "text_multiple_choice", questionFormat: "multiple_choice", choiceCount: 3, media: [] as const },
      { archetype: "text_multiple_choice", questionFormat: "multiple_choice", choiceCount: 4, media: [] as const },
    ] as const;

    for (const tc of testCases) {
      const result = resolveQuizLayout({
        requestedLayout: "auto",
        aspectRatio: "9:16",
        ...tc,
      });

      assert.equal(result.ok, true, `Resolution failed for archetype=${tc.archetype}, format=${tc.questionFormat}`);
      if (result.ok) {
        assert.equal(
          (QUIZ_PORTRAIT_LAYOUT_IDS as readonly string[]).includes(result.layoutId),
          true,
          `Resolved layout ${result.layoutId} must be one of the portrait layout IDs`,
        );
        assert.deepEqual(result.capability.supportedAspectRatios, ["9:16"]);
      }
    }
  });
});

describe("16:9 landscape layout resolution policy (backward compatibility)", () => {
  it("preserves verdict_true_false resolution for true/false questions", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "true_false",
      questionFormat: "true_false",
      choiceCount: 2,
      aspectRatio: "16:9",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "verdict_true_false");
      assert.deepEqual(result.capability.supportedAspectRatios, ["16:9"]);
    }
  });

  it("defaults undefined aspectRatio to 16:9 landscape resolution", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "text_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 3,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "media_left_choices_right");
      assert.deepEqual(result.capability.supportedAspectRatios, ["16:9"]);
    }
  });

  it("preserves visual_choices_three for visual_multiple_choice archetype", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "visual_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 3,
      aspectRatio: "16:9",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "visual_choices_three");
    }
  });

  it("preserves visual_choices_three_pure for odd_one_out format", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "text_multiple_choice",
      questionFormat: "odd_one_out",
      choiceCount: 3,
      aspectRatio: "16:9",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "visual_choices_three_pure");
    }
  });

  it("preserves mystery_reveal for mystery_reveal archetype", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "mystery_reveal",
      questionFormat: "image_guess",
      choiceCount: 2,
      aspectRatio: "16:9",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "mystery_reveal");
    }
  });

  it("preserves clue_deduction for clue_deduction archetype", () => {
    const result = resolveQuizLayout({
      requestedLayout: "auto",
      archetype: "clue_deduction",
      questionFormat: "multiple_choice",
      choiceCount: 2,
      aspectRatio: "16:9",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "clue_deduction");
    }
  });
});

describe("Explicit layout request and aspect ratio compatibility enforcement", () => {
  it("permits explicit portrait layout request with 9:16 aspect ratio", () => {
    const result = resolveQuizLayout({
      requestedLayout: "portrait_hero_choices",
      archetype: "illustrated_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 3,
      aspectRatio: "9:16",
      media: ["question"],
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "portrait_hero_choices");
      assert.equal(result.source, "explicit");
    }
  });

  it("rejects explicit portrait layout request when aspect ratio is 16:9", () => {
    const result = resolveQuizLayout({
      requestedLayout: "portrait_hero_choices",
      archetype: "illustrated_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 3,
      aspectRatio: "16:9",
      media: ["question"],
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.source, "explicit");
      const issueCodes = result.issues.map((i) => i.code);
      assert.equal(issueCodes.includes("layout_aspect_ratio_unsupported"), true);
    }
  });

  it("permits explicit landscape layout request with 16:9 aspect ratio", () => {
    const result = resolveQuizLayout({
      requestedLayout: "split_versus_two",
      archetype: "text_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 2,
      aspectRatio: "16:9",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.layoutId, "split_versus_two");
      assert.equal(result.source, "explicit");
    }
  });

  it("rejects explicit landscape layout request when aspect ratio is 9:16", () => {
    const result = resolveQuizLayout({
      requestedLayout: "split_versus_two",
      archetype: "text_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 2,
      aspectRatio: "9:16",
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.source, "explicit");
      const issueCodes = result.issues.map((i) => i.code);
      assert.equal(issueCodes.includes("layout_aspect_ratio_unsupported"), true);
    }
  });

  it("rejects unknown layout IDs", () => {
    const result = resolveQuizLayout({
      requestedLayout: "invalid_layout_name" as any,
      archetype: "text_multiple_choice",
      questionFormat: "multiple_choice",
      choiceCount: 3,
      aspectRatio: "9:16",
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.source, "explicit");
      assert.equal(result.issues[0]?.code, "layout_no_compatible_candidate");
    }
  });
});

describe("preferredAutoLayout helper function", () => {
  it("supports positional and object call styles", () => {
    const positional = preferredAutoLayout("true_false", "true_false", { aspectRatio: "9:16" });
    const objectStyle = preferredAutoLayout({
      archetype: "true_false",
      questionFormat: "true_false",
      aspectRatio: "9:16",
    });

    assert.equal(positional, "portrait_verdict_tf");
    assert.equal(objectStyle, "portrait_verdict_tf");
  });

  it("candidate lists are properly partitioned", () => {
    assert.deepEqual(PORTRAIT_QUIZ_AUTO_CANDIDATES, [
      "portrait_hero_choices",
      "portrait_split_versus",
      "portrait_verdict_tf",
      "portrait_stack_list",
    ]);

    for (const layoutId of PORTRAIT_QUIZ_AUTO_CANDIDATES) {
      assert.deepEqual(QUIZ_LAYOUT_CATALOG[layoutId].supportedAspectRatios, ["9:16"]);
    }

    for (const layoutId of LANDSCAPE_QUIZ_AUTO_CANDIDATES) {
      assert.deepEqual(QUIZ_LAYOUT_CATALOG[layoutId].supportedAspectRatios, ["16:9"]);
    }
  });
});
