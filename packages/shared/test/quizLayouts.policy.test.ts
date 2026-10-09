import assert from "node:assert/strict";
import nodeTest from "node:test";
import {
  QUIZ_LANDSCAPE_LAYOUT_IDS,
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
  assert.deepEqual(filterQuizLayoutsByAspectRatio("9:16"), []);
});

test("portrait quiz compatibility requests are explicitly rejected", () => {
  assert.throws(() => getCompatibleQuizLayout("media_left_choices_right", "9:16"), /16:9 landscape only/);
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
