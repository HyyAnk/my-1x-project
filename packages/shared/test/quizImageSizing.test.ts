import test from "node:test";
import assert from "node:assert/strict";
import { getQuizImageSlotGeometry, recommendImageSizing, type ImageSlotGeometry, type ImageFit } from "../src/quizImageSizing/index.js";

function makeGeometry(width: number, height: number, fit: ImageFit = "cover", layoutId = "visual_choices_three"): ImageSlotGeometry {
  return {
    layoutId: layoutId as any,
    purpose: "answer_option",
    canvas: { width: 1920, height: 1080 },
    viewports: [{ width, height, fit }],
    geometryKey: `test:${width}x${height}:${fit}`,
  };
}

test("quizImageSizing - canonical formula test cases", () => {
  const cases = [
    [432, 336, "4:3", 672, 504],
    [432, 484, "1:1", 728, 728],
    [622, 342, "16:9", 1024, 576],
    [450, 600, "3:4", 696, 928],
  ] as const;

  for (const [width, height, ratio, rw, rh] of cases) {
    const result = recommendImageSizing(makeGeometry(width, height, "cover"));
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error(result.code);
    assert.equal(result.value.aspectRatio, ratio);
    assert.deepEqual(result.value.recommended, { width: rw, height: rh });
  }
});

test("quizImageSizing - contain slot reports zero crop loss and reports unused area", () => {
  const result = recommendImageSizing(makeGeometry(800, 450, "contain"));
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.code);
  assert.equal(result.value.aspectRatio, "16:9");
  assert.equal(result.value.maxCropLoss, 0);
  assert.equal(result.value.maxUnusedArea, 0);
});

test("quizImageSizing - multiple viewports minimax selection", () => {
  const geometry: ImageSlotGeometry = {
    layoutId: "mystery_reveal",
    purpose: "hero_question_image",
    canvas: { width: 1920, height: 1080 },
    viewports: [
      { width: 754.8, height: 249.27, fit: "contain" },
      { width: 761.6, height: 255.36, fit: "contain" },
    ],
    geometryKey: "mystery:dual",
  };
  const result = recommendImageSizing(geometry);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.code);
  assert.equal(result.value.aspectRatio, "16:9");
  assert.equal(result.value.maxCropLoss, 0);
});

test("quizImageSizing - candidate order independence", () => {
  const geom = makeGeometry(432, 336, "cover");
  const forwardResult = recommendImageSizing(geom, ["1:1", "4:3", "3:4", "16:9"]);
  const reversedResult = recommendImageSizing(geom, ["16:9", "3:4", "4:3", "1:1"]);
  assert.equal(forwardResult.ok, true);
  assert.equal(reversedResult.ok, true);
  if (!forwardResult.ok || !reversedResult.ok) throw new Error("failed");
  assert.equal(forwardResult.value.aspectRatio, reversedResult.value.aspectRatio);
  assert.deepEqual(forwardResult.value.recommended, reversedResult.value.recommended);
});

test("quizImageSizing - exact tie breaks by fixed priority order 1:1, 4:3, 3:4, 16:9", () => {
  // If a viewport is exactly square, 1:1 is a zero loss, but suppose candidate losses were tied
  const geom = makeGeometry(500, 500, "cover");
  const result = recommendImageSizing(geom, ["16:9", "4:3", "1:1"]);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.code);
  assert.equal(result.value.aspectRatio, "1:1");
});

test("quizImageSizing - invalid dimensions and empty viewports return invalid_geometry", () => {
  assert.deepEqual(
    recommendImageSizing({
      layoutId: "visual_choices_three",
      purpose: "answer_option",
      canvas: { width: 1920, height: 1080 },
      viewports: [],
      geometryKey: "empty",
    }),
    { ok: false, code: "invalid_geometry" },
  );

  assert.deepEqual(recommendImageSizing(makeGeometry(0, 336, "cover")), {
    ok: false,
    code: "invalid_geometry",
  });
  assert.deepEqual(recommendImageSizing(makeGeometry(-10, 336, "cover")), {
    ok: false,
    code: "invalid_geometry",
  });
  assert.deepEqual(recommendImageSizing(makeGeometry(NaN, 336, "cover")), {
    ok: false,
    code: "invalid_geometry",
  });
  assert.deepEqual(recommendImageSizing(makeGeometry(Infinity, 336, "cover")), {
    ok: false,
    code: "invalid_geometry",
  });
});

test("quizImageSizing - empty supported candidates return unsupported_ratio_set", () => {
  const geom = makeGeometry(432, 336, "cover");
  assert.deepEqual(recommendImageSizing(geom, []), {
    ok: false,
    code: "unsupported_ratio_set",
  });
});

test("quizImageSizing - getQuizImageSlotGeometry returns null for text mode or layout without slot", () => {
  // Full stack list has no image slots
  const fullStackHero = getQuizImageSlotGeometry({
    layoutId: "full_stack_list",
    purpose: "hero_question_image",
    presentation: "text",
    choiceCount: 3,
    canvasAspectRatio: "16:9",
  });
  assert.equal(fullStackHero, null);

  const fullStackChoice = getQuizImageSlotGeometry({
    layoutId: "full_stack_list",
    purpose: "answer_option",
    presentation: "text",
    choiceCount: 3,
    canvasAspectRatio: "16:9",
  });
  assert.equal(fullStackChoice, null);

  // Split versus text mode produces no choice images
  const splitTextChoice = getQuizImageSlotGeometry({
    layoutId: "split_versus_two",
    purpose: "answer_option",
    presentation: "text",
    choiceCount: 2,
    canvasAspectRatio: "16:9",
  });
  assert.equal(splitTextChoice, null);

  // Split versus visual mode produces 622 x 342 slot
  const splitVisualChoice = getQuizImageSlotGeometry({
    layoutId: "split_versus_two",
    purpose: "answer_option",
    presentation: "visual",
    choiceCount: 2,
    canvasAspectRatio: "16:9",
  });
  assert.notEqual(splitVisualChoice, null);
  assert.deepEqual(splitVisualChoice?.viewports[0], { width: 622, height: 342, fit: "cover" });

  // Visual choices three produces 432 x 336
  const vcChoice = getQuizImageSlotGeometry({
    layoutId: "visual_choices_three",
    purpose: "answer_option",
    presentation: "visual",
    choiceCount: 3,
    canvasAspectRatio: "16:9",
  });
  assert.notEqual(vcChoice, null);
  assert.deepEqual(vcChoice?.viewports[0], { width: 432, height: 336, fit: "cover" });

  // Visual choices three pure produces 432 x 484
  const pureChoice = getQuizImageSlotGeometry({
    layoutId: "visual_choices_three_pure",
    purpose: "answer_option",
    presentation: "visual",
    choiceCount: 3,
    canvasAspectRatio: "16:9",
  });
  assert.notEqual(pureChoice, null);
  assert.deepEqual(pureChoice?.viewports[0], { width: 432, height: 484, fit: "cover" });
});
