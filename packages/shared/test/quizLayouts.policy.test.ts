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
  const result = resolveQuizLayout({
    requestedLayout: "auto",
    archetype: "true_false",
    questionFormat: "true_false",
    choiceCount: 2,
    aspectRatio: "16:9",
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.layoutId, "verdict_true_false");
});
