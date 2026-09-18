import test from "node:test";
import assert from "node:assert/strict";
import { FIXED_FRAME_GEOMETRY, QUIZ_LANDSCAPE_LAYOUT_IDS, QUIZ_LAYOUT_GEOMETRY } from "../src/quizLayoutGeometry/index.js";

void test("quizLayoutGeometry - fixed frame anchors match planning targets", () => {
  assert.deepEqual(FIXED_FRAME_GEOMETRY.canvas, { width: 1920, height: 1080 });
  assert.deepEqual(FIXED_FRAME_GEOMETRY.question, { x: 380, y: 53, width: 1420, height: 168 });
  assert.deepEqual(FIXED_FRAME_GEOMETRY.counter, {
    x: 0,
    top: 53,
    width: 380,
    height: 168,
    centerX: 190,
    bodyCenterY: 137,
  });
  assert.deepEqual(FIXED_FRAME_GEOMETRY.brand, { centerX: 180, top: 390, width: 320 });
  assert.deepEqual(FIXED_FRAME_GEOMETRY.thinking, { x: 470, y: 936, width: 1240, height: 84 });
  assert.deepEqual(FIXED_FRAME_GEOMETRY.factBefore, { x: 470, y: 846, width: 1240, height: 156 });
  assert.deepEqual(FIXED_FRAME_GEOMETRY.factAfter, { x: 470, y: 886, width: 1240, height: 156 });
  assert.equal(FIXED_FRAME_GEOMETRY.factBottomClearance, 38);
});

void test("quizLayoutGeometry - all seven landscape layouts defined and frozen", () => {
  assert.equal(QUIZ_LANDSCAPE_LAYOUT_IDS.length, 7);
  for (const layoutId of QUIZ_LANDSCAPE_LAYOUT_IDS) {
    const geom = QUIZ_LAYOUT_GEOMETRY[layoutId];
    assert.notEqual(geom, undefined, `layout ${layoutId} must be defined`);
    assert.equal(geom.layoutId, layoutId);
    assert.equal(Object.isFrozen(geom), true, `layout ${layoutId} must be frozen`);
  }
});

void test("quizLayoutGeometry - media_left_choices_right exact coordinates", () => {
  const g = QUIZ_LAYOUT_GEOMETRY.media_left_choices_right;
  assert.deepEqual(g.arena, { x: 380, y: 253, width: 1420, height: 570 });
  assert.deepEqual(g.hero, { x: 380, y: 253, width: 720, height: 570 });
  assert.deepEqual(g.imageSlot?.viewport, { width: 696, height: 546, fit: "cover" });

  // 3 choices
  const v3 = g.answerVariants[3]!;
  assert.equal(v3.outer.length, 3);
  assert.deepEqual(
    v3.outer.map((o) => o.y),
    [304, 472, 640],
  );
  assert.deepEqual(
    v3.badge.map((b) => b.width),
    [132, 132, 132],
  );
  assert.deepEqual(
    v3.text.map((t) => t.y),
    [316, 484, 652],
  );
  assert.deepEqual(
    v3.text.map((t) => t.x),
    [1234, 1234, 1234],
  );
  assert.equal(v3.gap, 36);
  assert.equal(v3.overlap, 38);

  // 2 choices
  const v2 = g.answerVariants[2]!;
  assert.equal(v2.outer.length, 2);
  assert.deepEqual(
    v2.outer.map((o) => o.y),
    [366, 558],
  );
  assert.deepEqual(
    v2.badge.map((b) => b.width),
    [152, 152],
  );
  assert.deepEqual(
    v2.text.map((t) => t.y),
    [380, 572],
  );
  assert.deepEqual(
    v2.text.map((t) => t.x),
    [1248, 1248],
  );
  assert.equal(v2.gap, 40);
  assert.equal(v2.overlap, 44);
});

void test("quizLayoutGeometry - visual_choices_three exact coordinates", () => {
  const g = QUIZ_LAYOUT_GEOMETRY.visual_choices_three;
  assert.deepEqual(g.arena, { x: 380, y: 253, width: 1420, height: 586 });
  assert.deepEqual(g.cardSize, { width: 452, height: 586 });
  assert.deepEqual(g.imageSlot?.mediaBorderBox, { width: 452, height: 461 });
  assert.deepEqual(g.imageSlot?.viewport, { width: 432, height: 441, fit: "cover" });

  const v3 = g.answerVariants[3]!;
  assert.deepEqual(
    v3.outer.map((o) => o.x),
    [380, 864, 1348],
  );
  assert.deepEqual(
    v3.outer.map((o) => o.y),
    [735, 735, 735],
  );
  assert.deepEqual(
    v3.badge.map((b) => b.width),
    [104, 104, 104],
  );
  assert.deepEqual(
    v3.text.map((t) => t.x),
    [454, 938, 1422],
  );
  assert.deepEqual(
    v3.text.map((t) => t.y),
    [744, 744, 744],
  );
  assert.equal(v3.overlap, 30);
});

void test("quizLayoutGeometry - visual_choices_three_pure exact coordinates", () => {
  const g = QUIZ_LAYOUT_GEOMETRY.visual_choices_three_pure;
  assert.deepEqual(g.arena, { x: 380, y: 253, width: 1420, height: 608 });
  assert.deepEqual(g.imageSlot?.mediaBorderBox, { width: 452, height: 564 });
  assert.deepEqual(g.imageSlot?.viewport, { width: 432, height: 544, fit: "cover" });

  const v3 = g.answerVariants[3]!;
  assert.deepEqual(
    v3.badge.map((b) => b.y),
    [773, 773, 773],
  );
  assert.deepEqual(
    v3.badge.map((b) => b.x),
    [562, 1046, 1530],
  );
  assert.deepEqual(
    v3.badge.map((b) => b.width),
    [88, 88, 88],
  );
});

void test("quizLayoutGeometry - split_versus_two exact coordinates", () => {
  const g = QUIZ_LAYOUT_GEOMETRY.split_versus_two;
  assert.deepEqual(g.arena, { x: 380, y: 253, width: 1420, height: 578 });
  assert.deepEqual(g.cardSize, { width: 698, height: 578 });
  assert.deepEqual(g.imageSlot?.mediaBorderBox, { width: 698, height: 446 });
  assert.deepEqual(g.imageSlot?.viewport, { width: 674, height: 422, fit: "cover" });

  const v2 = g.answerVariants[2]!;
  assert.deepEqual(
    v2.outer.map((o) => o.x),
    [380, 1102],
  );
  assert.deepEqual(
    v2.outer.map((o) => o.y),
    [709, 709],
  );
  assert.deepEqual(
    v2.outer.map((o) => o.width),
    [698, 698],
  );
  assert.deepEqual(
    v2.outer.map((o) => o.height),
    [122, 122],
  );
  assert.equal(v2.badge.length, 0);
  assert.deepEqual(
    v2.text.map((t) => t.y),
    [709, 709],
  );
  assert.deepEqual(g.extra?.versusEmblem, { x: 1028, y: 414, width: 124, height: 124 });
});

void test("quizLayoutGeometry - verdict_true_false exact coordinates", () => {
  const g = QUIZ_LAYOUT_GEOMETRY.verdict_true_false;
  assert.deepEqual(g.arena, { x: 380, y: 253, width: 1420, height: 565 });
  assert.deepEqual(g.hero, { x: 380, y: 253, width: 820, height: 565 });
  assert.deepEqual(g.imageSlot?.viewport, { width: 800, height: 545, fit: "cover" });

  const v2 = g.answerVariants[2]!;
  assert.deepEqual(
    v2.outer.map((o) => o.y),
    [349.5, 557.5],
  );
  assert.deepEqual(
    v2.outer.map((o) => o.width),
    [560, 560],
  );
  assert.deepEqual(
    v2.outer.map((o) => o.height),
    [164, 164],
  );
  assert.equal(v2.badge.length, 0);
  assert.equal(v2.gap, 44);
});

void test("quizLayoutGeometry - full_stack_list exact coordinates", () => {
  const g = QUIZ_LAYOUT_GEOMETRY.full_stack_list;
  assert.deepEqual(g.arena, { x: 380, y: 253, width: 1420, height: 528 });

  // 3 choices: A fixed at 275, B +15 (458), C +30 (641)
  const v3 = g.answerVariants[3]!;
  assert.deepEqual(
    v3.outer.map((o) => o.y),
    [275, 458, 641],
  );
  assert.equal(v3.gap, 43);
  assert.equal(v3.overlap, 40);
  assert.deepEqual(
    v3.text.map((text) => text.x),
    [550, 550, 550],
  );

  // 2 choices: first at 329, second at 548
  const v2 = g.answerVariants[2]!;
  assert.deepEqual(
    v2.outer.map((o) => o.y),
    [329, 548],
  );
  assert.equal(v2.gap, 55);
  assert.equal(v2.overlap, 46);
  assert.deepEqual(
    v2.text.map((text) => text.x),
    [568, 568],
  );
});

void test("quizLayoutGeometry - mystery_reveal exact coordinates", () => {
  const g = QUIZ_LAYOUT_GEOMETRY.mystery_reveal;
  assert.deepEqual(g.arena, { x: 380, y: 253, width: 1420, height: 757 });
  assert.deepEqual(g.hero, { x: 630, y: 253, width: 920, height: 540 });
  assert.deepEqual(g.imageSlot?.slot, { width: 880, height: 500 });
  assert.deepEqual(g.imageSlot?.viewport, { width: 880, height: 495, fit: "contain" });

  const v1 = g.answerVariants[1]!;
  assert.deepEqual(v1.outer, [{ x: 630, y: 890, width: 920, height: 120 }]);
  assert.equal(v1.badge.length, 0);
});
