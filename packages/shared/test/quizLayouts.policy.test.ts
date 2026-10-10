import assert from "node:assert/strict";
import nodeTest from "node:test";
import {
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  QUIZ_LAYOUTS,
  filterQuizLayoutsByAspectRatio,
  getCompatibleQuizLayout,
  resolveQuizLayout,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;

const test = (name: string, testCase: TestCallback): void => {
  void nodeTest(name, testCase);
};

test("the production quiz catalog contains landscape layouts only", () => {
  assert.deepEqual(
    QUIZ_LAYOUTS.map((layout) => layout.id),
    [...QUIZ_LANDSCAPE_LAYOUT_IDS],
  );
  assert.deepEqual(filterQuizLayoutsByAspectRatio("16:9"), QUIZ_LANDSCAPE_LAYOUT_IDS);
  assert.deepEqual(filterQuizLayoutsByAspectRatio("9:16"), QUIZ_PORTRAIT_LAYOUT_IDS);
});

test("crossing the aspect ratio boundary maps onto the sibling catalog", () => {
  assert.equal(getCompatibleQuizLayout("media_left_choices_right", "9:16"), "short_media_top_choices");
  assert.equal(getCompatibleQuizLayout("short_verdict_yes_no", "16:9"), "verdict_yes_no");
  assert.equal(getCompatibleQuizLayout("full_stack_list", "16:9"), "full_stack_list");
});

test("landscape automatic layout resolution remains available", () => {
  const yesNoResult = resolveQuizLayout({
    requestedLayout: "auto",
    archetype: "yes_no",
    questionFormat: "yes_no",
    choiceCount: 2,
    aspectRatio: "16:9",
  });
  assert.equal(yesNoResult.ok, true);
  if (yesNoResult.ok) assert.equal(yesNoResult.layoutId, "verdict_yes_no");
});
