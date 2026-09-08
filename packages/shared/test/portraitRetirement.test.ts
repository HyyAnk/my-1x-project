import assert from "node:assert/strict";
import nodeTest from "node:test";
import {
  EpisodeSettingsInputSchema,
  EpisodeTopicConfirmInputSchema,
  ChannelMascotConfigSchema,
  ImageAspectRatioSchema,
  QuizConfigSchema,
  QuizLayoutIdSchema,
  SandboxPreviewInputSchema,
  ShortReelRecordSchema,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;

const test = (name: string, testCase: TestCallback): void => {
  void nodeTest(name, testCase);
};

test("RT-01 rejects portrait configuration at Episode boundaries", () => {
  assert.equal(EpisodeTopicConfirmInputSchema.safeParse({ render_aspect_ratio: "9:16" }).success, false);
  assert.equal(EpisodeSettingsInputSchema.safeParse({ render_aspect_ratio: "9:16" }).success, false);
  assert.equal(QuizConfigSchema.shape.render_aspect_ratio.safeParse("9:16").success, false);
  assert.equal(QuizConfigSchema.shape.render_aspect_ratio.safeParse("16:9").success, true);
});

test("RT-02 retires portrait quiz layouts and Sandbox portrait mode", () => {
  for (const layoutId of ["portrait_hero_choices", "portrait_split_versus", "portrait_verdict_tf", "portrait_stack_list"]) {
    assert.equal(QuizLayoutIdSchema.safeParse(layoutId).success, false);
  }
  assert.equal(SandboxPreviewInputSchema.safeParse({ aspect_ratio: "9:16" }).success, false);
  assert.equal(
    ChannelMascotConfigSchema.safeParse({
      placements: {
        "9:16": { position: "bottom_left", scale: 1, offset_x: 0, offset_y: 0, flip_x: false },
      },
    }).success,
    false,
  );
});

test("RT-03 preserves generic portrait media and Short-Reel output", () => {
  assert.equal(ImageAspectRatioSchema.safeParse("9:16").success, true);
  assert.equal(ShortReelRecordSchema.shape.aspect_ratio.safeParse("9:16").success, true);
});
