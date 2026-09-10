import assert from "node:assert/strict";
import nodeTest from "node:test";
import {
  QUIZ_LAYOUT_CATALOG,
  QUIZ_PREVIEW_BASELINE_CAPABILITY,
  type QuizLayoutAssetAspectRatio,
  resolveQuizLayoutAssetAspectRatio,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;

const test = (name: string, testCase: TestCallback): void => {
  void nodeTest(name, testCase);
};

test("QUIZ_LAYOUT_CATALOG enforces standardized asset metrics and aspect ratios", () => {
  // media_left_choices_right: 4:3 question asset
  assert.deepEqual(QUIZ_LAYOUT_CATALOG.media_left_choices_right.metrics.assets.question, {
    maxWidth: 1080,
    maxHeight: 810,
    aspectRatio: "4:3",
  });

  // verdict_true_false: 4:3 question asset
  assert.deepEqual(QUIZ_LAYOUT_CATALOG.verdict_true_false.metrics.assets.question, {
    maxWidth: 1080,
    maxHeight: 810,
    aspectRatio: "4:3",
  });

  // clue_deduction: 4:3 question asset
  assert.deepEqual(QUIZ_LAYOUT_CATALOG.clue_deduction.metrics.assets.question, {
    maxWidth: 1080,
    maxHeight: 810,
    aspectRatio: "4:3",
  });

  // visual_choices_three: 1:1 choice asset
  assert.deepEqual(QUIZ_LAYOUT_CATALOG.visual_choices_three.metrics.assets.choice, {
    maxWidth: 640,
    maxHeight: 640,
    aspectRatio: "1:1",
  });

  // visual_choices_three_pure: 1:1 choice asset
  assert.deepEqual(QUIZ_LAYOUT_CATALOG.visual_choices_three_pure.metrics.assets.choice, {
    maxWidth: 640,
    maxHeight: 640,
    aspectRatio: "1:1",
  });

  // split_versus_two: 1:1 choice asset, 4:3 question asset
  assert.deepEqual(QUIZ_LAYOUT_CATALOG.split_versus_two.metrics.assets.choice, {
    maxWidth: 640,
    maxHeight: 640,
    aspectRatio: "1:1",
  });
  assert.deepEqual(QUIZ_LAYOUT_CATALOG.split_versus_two.metrics.assets.question, {
    maxWidth: 1080,
    maxHeight: 810,
    aspectRatio: "4:3",
  });

  // mystery_reveal: 16:9 question asset
  assert.deepEqual(QUIZ_LAYOUT_CATALOG.mystery_reveal.metrics.assets.question, {
    maxWidth: 1280,
    maxHeight: 720,
    aspectRatio: "16:9",
  });

  // full_stack_list: empty assets
  assert.deepEqual(QUIZ_LAYOUT_CATALOG.full_stack_list.metrics.assets, {});

  // baseline: 16:9 question asset
  assert.deepEqual(QUIZ_PREVIEW_BASELINE_CAPABILITY.metrics.assets.question, {
    maxWidth: 1080,
    maxHeight: 608,
    aspectRatio: "16:9",
  });
});

test("resolveQuizLayoutAssetAspectRatio resolves question asset ratios correctly", () => {
  // 4:3 layouts
  assert.equal(resolveQuizLayoutAssetAspectRatio("media_left_choices_right", "hero_question_image"), "4:3");
  assert.equal(resolveQuizLayoutAssetAspectRatio("media_left_choices_right", "question_illustration"), "4:3");
  assert.equal(resolveQuizLayoutAssetAspectRatio("verdict_true_false", "hero_question_image"), "4:3");
  assert.equal(resolveQuizLayoutAssetAspectRatio("clue_deduction", "hero_question_image"), "4:3");
  assert.equal(resolveQuizLayoutAssetAspectRatio("split_versus_two", "hero_question_image"), "4:3");

  // 16:9 layouts
  assert.equal(resolveQuizLayoutAssetAspectRatio("mystery_reveal", "hero_question_image"), "16:9");
  assert.equal(resolveQuizLayoutAssetAspectRatio("mystery_reveal", "question_illustration"), "16:9");
  assert.equal(resolveQuizLayoutAssetAspectRatio("baseline", "hero_question_image"), "16:9");
  assert.equal(resolveQuizLayoutAssetAspectRatio("baseline", "question_illustration"), "16:9");
});

test("resolveQuizLayoutAssetAspectRatio resolves choice asset ratios correctly", () => {
  // 1:1 layouts
  assert.equal(resolveQuizLayoutAssetAspectRatio("visual_choices_three", "answer_option"), "1:1");
  assert.equal(resolveQuizLayoutAssetAspectRatio("visual_choices_three", "choice_illustration"), "1:1");
  assert.equal(resolveQuizLayoutAssetAspectRatio("visual_choices_three_pure", "answer_option"), "1:1");
  assert.equal(resolveQuizLayoutAssetAspectRatio("visual_choices_three_pure", "choice_illustration"), "1:1");
  assert.equal(resolveQuizLayoutAssetAspectRatio("split_versus_two", "answer_option"), "1:1");
  assert.equal(resolveQuizLayoutAssetAspectRatio("split_versus_two", "choice_illustration"), "1:1");
});

test("resolveQuizLayoutAssetAspectRatio safely handles fallbacks", () => {
  // Layout without question assets falls back to 16:9 for hero_question_image
  assert.equal(resolveQuizLayoutAssetAspectRatio("full_stack_list", "hero_question_image"), "16:9");
  assert.equal(resolveQuizLayoutAssetAspectRatio("full_stack_list", "question_illustration"), "16:9");

  // Layout without choice assets falls back to 1:1 for answer_option
  assert.equal(resolveQuizLayoutAssetAspectRatio("media_left_choices_right", "answer_option"), "1:1");
  assert.equal(resolveQuizLayoutAssetAspectRatio("media_left_choices_right", "choice_illustration"), "1:1");

  // Unknown layoutId falls back safely based on purpose
  assert.equal(resolveQuizLayoutAssetAspectRatio("unknown_layout", "hero_question_image"), "16:9");
  assert.equal(resolveQuizLayoutAssetAspectRatio("unknown_layout", "question_illustration"), "16:9");
  assert.equal(resolveQuizLayoutAssetAspectRatio("unknown_layout", "answer_option"), "1:1");
  assert.equal(resolveQuizLayoutAssetAspectRatio("unknown_layout", "choice_illustration"), "1:1");
  assert.equal(resolveQuizLayoutAssetAspectRatio("unknown_layout", "unknown_purpose"), "16:9");

  // Unknown purpose on known layout falls back to 16:9
  assert.equal(resolveQuizLayoutAssetAspectRatio("media_left_choices_right", "unknown_purpose"), "16:9");
  assert.equal(resolveQuizLayoutAssetAspectRatio("visual_choices_three", "unknown_purpose"), "16:9");
});

test("QuizLayoutAssetAspectRatio type behaves as expected", () => {
  const ratios: QuizLayoutAssetAspectRatio[] = ["16:9", "4:3", "1:1", "3:4"];
  assert.equal(ratios.length, 4);
});
