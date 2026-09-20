import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_PRESETS,
  DEFAULT_BUILT_IN_PRESET_ID,
  findMascotStyleByBuiltInPreset,
  getBuiltInMascotStyleId,
  QuizConfigSchema,
  reconcileMascotBuiltInStyles,
  resolveMascotStyleIdForQuizConfig,
  type MascotProfile,
  type MascotStyle,
  type VisualPresetItem,
} from "../src/index.js";

const timestamp = "2026-09-20T00:00:00.000Z";

function profile(styles: MascotStyle[] = []): MascotProfile {
  return {
    id: "mascot_test",
    name: "Registry Mascot",
    description: "",
    visual_style: "pixar_3d",
    master_prompt: "",
    master_image_url: "/api/mascots/mascot_test/assets/master.png",
    color_theme: "#06b6d4",
    actions: {},
    styles,
    assigned_channel_ids: [],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

test("reconciliation binds Core to Arcade and provisions one 10+10 style per registry preset", () => {
  const reconciled = reconcileMascotBuiltInStyles(profile());

  assert.equal(reconciled.styles?.length, BUILT_IN_PRESETS.length);
  assert.equal(reconciled.active_style_id, "core");
  for (const preset of BUILT_IN_PRESETS) {
    const style = findMascotStyleByBuiltInPreset(reconciled, preset.id);
    assert.ok(style, `Expected a managed style for ${preset.id}`);
    assert.equal(style.id, getBuiltInMascotStyleId(preset.id));
    assert.equal(style.states.thinking.length, 10);
    assert.equal(style.states.celebrate.length, 10);
  }
  assert.equal(findMascotStyleByBuiltInPreset(reconciled, DEFAULT_BUILT_IN_PRESET_ID)?.id, "core");
});

test("reconciliation is idempotent and preserves renamed styles and assets", () => {
  const first = reconcileMascotBuiltInStyles(profile());
  const cyber = findMascotStyleByBuiltInPreset(first, "preset_cyber_neon");
  assert.ok(cyber);
  const customized: MascotStyle = {
    ...cyber,
    name: "Nova Circuit",
    keyword: "electric explorer",
    anchor_image_url: "/api/mascots/mascot_test/assets/nova.png",
    states: {
      ...cyber.states,
      thinking: cyber.states.thinking.map((slot) =>
        slot.slot_index === 3 ? { ...slot, image_url: "/api/mascots/mascot_test/assets/thinking-3.png" } : slot,
      ),
    },
  };
  const withCustomization = { ...first, styles: first.styles?.map((style) => (style.id === cyber.id ? customized : style)) };

  const reconciled = reconcileMascotBuiltInStyles(withCustomization);
  const secondPass = reconcileMascotBuiltInStyles(reconciled);
  const preserved = findMascotStyleByBuiltInPreset(reconciled, "preset_cyber_neon");

  assert.equal(preserved?.name, "Nova Circuit");
  assert.equal(preserved?.anchor_image_url, "/api/mascots/mascot_test/assets/nova.png");
  assert.equal(preserved?.states.thinking[2]?.image_url, "/api/mascots/mascot_test/assets/thinking-3.png");
  assert.deepEqual(secondPass, reconciled);
});

test("adding a built-in preset automatically adds exactly one managed mascot style", () => {
  const syntheticPreset: VisualPresetItem = {
    ...BUILT_IN_PRESETS[0],
    id: "preset_future_world",
    name: "Future World",
  };
  const presets = [...BUILT_IN_PRESETS, syntheticPreset];
  const reconciled = reconcileMascotBuiltInStyles(profile(), presets);

  assert.equal(reconciled.styles?.length, presets.length);
  assert.equal(findMascotStyleByBuiltInPreset(reconciled, syntheticPreset.id)?.id, "builtin_future_world");
});

test("episode selection resolves built-in, specific, cycle, and legacy modes", () => {
  const reconciled = reconcileMascotBuiltInStyles(profile());
  const cyber = findMascotStyleByBuiltInPreset(reconciled, "preset_cyber_neon");
  assert.ok(cyber);

  assert.equal(
    resolveMascotStyleIdForQuizConfig(reconciled, {
      style_preset_id: "preset_cyber_neon",
      mascot_style_selection: { mode: "style_builtin" },
    }),
    cyber.id,
  );
  assert.equal(
    resolveMascotStyleIdForQuizConfig(reconciled, {
      mascot_style_selection: { mode: "specific_style", style_id: "core" },
    }),
    "core",
  );
  assert.equal(resolveMascotStyleIdForQuizConfig(reconciled, { mascot_style_selection: { mode: "cycle" } }), "cycle");
  assert.equal(resolveMascotStyleIdForQuizConfig(reconciled, { mascot_style_id: cyber.id }), cyber.id);
});

test("QuizConfigSchema defaults mascot selection to built-in style", () => {
  const config = QuizConfigSchema.parse({});
  assert.deepEqual(config.mascot_style_selection, { mode: "style_builtin" });
});
