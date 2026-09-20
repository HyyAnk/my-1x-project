import assert from "node:assert/strict";
import nodeTest from "node:test";
import {
  BUILT_IN_PRESETS,
  DEFAULT_BUILT_IN_PRESET_ID,
  findBuiltInPresetById,
  getBuiltInPresets,
  matchVisualPreset,
  resolveBuiltInPresetCategoryId,
  type QuizAnswerCardStyle,
  type QuizBackgroundStyle,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizThinkingBarStyle,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;

const test = (name: string, testCase: TestCallback): void => {
  void nodeTest(name, testCase);
};

test("BUILT_IN_PRESETS exposes an extensible registry with full metadata", () => {
  assert.ok(BUILT_IN_PRESETS.length > 0);
  assert.equal(getBuiltInPresets().length, BUILT_IN_PRESETS.length);
  assert.ok(findBuiltInPresetById(DEFAULT_BUILT_IN_PRESET_ID), "Default built-in preset must exist");

  for (const preset of BUILT_IN_PRESETS) {
    assert.ok(preset.id, "preset id must be defined");
    assert.ok(preset.name, "preset name must be defined");
    assert.ok(preset.description, "preset description must be defined");
    assert.ok(preset.icon, "preset icon must be defined");
    assert.equal(preset.theme, "candy_arcade");
    assert.ok(preset.palette_id, "preset palette_id must be defined");
    assert.equal(preset.isBuiltIn, true);
  }
});

test("Each built-in preset has a unique 5-element suite", () => {
  const thinkingBarStyles = new Set<QuizThinkingBarStyle>();
  const questionBoxStyles = new Set<QuizQuestionBoxStyle>();
  const answerCardStyles = new Set<QuizAnswerCardStyle>();
  const counterStyles = new Set<QuizQuestionCounterStyle>();
  const backgroundStyles = new Set<QuizBackgroundStyle>();

  for (const preset of BUILT_IN_PRESETS) {
    assert.ok(preset.thinking_bar_style, "thinking_bar_style must be defined");
    assert.ok(preset.question_box_style, "question_box_style must be defined");
    assert.ok(preset.answer_card_style, "answer_card_style must be defined");
    assert.ok(preset.counter_style, "counter_style must be defined");
    assert.ok(preset.background_style, "background_style must be defined");

    thinkingBarStyles.add(preset.thinking_bar_style);
    questionBoxStyles.add(preset.question_box_style);
    answerCardStyles.add(preset.answer_card_style);
    counterStyles.add(preset.counter_style);
    backgroundStyles.add(preset.background_style);
  }

  assert.equal(thinkingBarStyles.size, BUILT_IN_PRESETS.length, "Every preset must have a unique thinking_bar_style");
  assert.equal(questionBoxStyles.size, BUILT_IN_PRESETS.length, "Every preset must have a unique question_box_style");
  assert.equal(answerCardStyles.size, BUILT_IN_PRESETS.length, "Every preset must have a unique answer_card_style");
  assert.equal(counterStyles.size, BUILT_IN_PRESETS.length, "Every preset must have a unique counter_style");
  assert.equal(backgroundStyles.size, BUILT_IN_PRESETS.length, "Every preset must have a unique background_style");
});

test("BUILT_IN_PRESETS binds each preset to its exact thematic 5-element suite", () => {
  // 1. Arcade Pop Master
  const arcade = findBuiltInPresetById("preset_arcade_classic");
  assert.ok(arcade);
  assert.equal(arcade.thinking_bar_style, "star_slider");
  assert.equal(arcade.question_box_style, "candy_pop");
  assert.equal(arcade.answer_card_style, "glossy_arcade");
  assert.equal(arcade.counter_style, "hanging_woodsign");
  assert.equal(arcade.background_style, "candy_rays");

  // 2. Cyber Neon Pulse
  const cyber = findBuiltInPresetById("preset_cyber_neon");
  assert.ok(cyber);
  assert.equal(cyber.thinking_bar_style, "energy_laser");
  assert.equal(cyber.question_box_style, "glass_morphism");
  assert.equal(cyber.answer_card_style, "glass_neon");
  assert.equal(cyber.counter_style, "neon_badge");
  assert.equal(cyber.background_style, "aurora_glow");

  // 3. Comic Action Boom
  const comic = findBuiltInPresetById("preset_comic_boom");
  assert.ok(comic);
  assert.equal(comic.thinking_bar_style, "flame_fuse");
  assert.equal(comic.question_box_style, "comic_bubble");
  assert.equal(comic.answer_card_style, "comic_chunky");
  assert.equal(comic.counter_style, "floating_balloon");
  assert.equal(comic.background_style, "comic_burst");

  // 4. Build Zone Crew
  const build = findBuiltInPresetById("preset_build_zone");
  assert.ok(build);
  assert.equal(build.thinking_bar_style, "construction_machine");
  assert.equal(build.question_box_style, "hazard_stripes");
  assert.equal(build.answer_card_style, "steel_beam_plate");
  assert.equal(build.counter_style, "golden_shield");
  assert.equal(build.background_style, "construction_blueprint");

  // 5. Cosmic Space Voyager
  const cosmic = findBuiltInPresetById("preset_cosmic_space");
  assert.ok(cosmic);
  assert.equal(cosmic.thinking_bar_style, "cosmic_rocket");
  assert.equal(cosmic.question_box_style, "cockpit_hud");
  assert.equal(cosmic.answer_card_style, "minimal_soft");
  assert.equal(cosmic.counter_style, "space_radar");
  assert.equal(cosmic.background_style, "cosmic_starfield");

  // 6. Sweet Pastel Pop
  const pastel = findBuiltInPresetById("preset_pastel_dream");
  assert.ok(pastel);
  assert.equal(pastel.thinking_bar_style, "capsule_liquid");
  assert.equal(pastel.question_box_style, "pastel_cloud");
  assert.equal(pastel.answer_card_style, "pastel_marshmallow");
  assert.equal(pastel.counter_style, "bubble_badge");
  assert.equal(pastel.background_style, "floating_clouds");

  // 7. Treasure Quest
  const quest = findBuiltInPresetById("preset_treasure_quest");
  assert.ok(quest);
  assert.equal(quest.thinking_bar_style, "treasure_trail");
  assert.equal(quest.question_box_style, "parchment_scroll");
  assert.equal(quest.answer_card_style, "rustic_wood_plank");
  assert.equal(quest.counter_style, "golden_compass");
  assert.equal(quest.background_style, "treasure_map");
});

test("matchVisualPreset matches preset by complete and partial 5-element criteria", () => {
  const matchedBuild = matchVisualPreset({
    question_box_style: "hazard_stripes",
    answer_card_style: "steel_beam_plate",
  });
  assert.equal(matchedBuild?.id, "preset_build_zone");

  const matchedCosmic = matchVisualPreset({
    thinking_bar_style: "cosmic_rocket",
    background_style: "cosmic_starfield",
  });
  assert.equal(matchedCosmic?.id, "preset_cosmic_space");

  const matchedPastel = matchVisualPreset({
    counter_style: "bubble_badge",
    background_style: "floating_clouds",
  });
  assert.equal(matchedPastel?.id, "preset_pastel_dream");
});

test("resolveBuiltInPresetCategoryId canonicalizes direct, legacy, and inferred presets", () => {
  assert.equal(resolveBuiltInPresetCategoryId({ style_preset_id: "preset_cyber_neon" }), "preset_cyber_neon");
  assert.equal(resolveBuiltInPresetCategoryId({ style_preset_id: "preset_visual_showcase" }), "preset_pastel_dream");
  assert.equal(resolveBuiltInPresetCategoryId({ background_style: "treasure_map" }), "preset_treasure_quest");
  assert.equal(resolveBuiltInPresetCategoryId(), "preset_arcade_classic");
});
