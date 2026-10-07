import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_MOTION_TEMPLATES,
  getMotionTemplateDefinition,
  IntroOutroSelectionSchema,
  isValidMotionTemplateId,
  listMotionTemplates,
  MotionTemplateCategorySchema,
  MotionTemplateDefinitionSchema,
  MotionTemplateIdSchema,
  MotionTemplatePlacementSchema,
  QuizConfigSchema,
} from "../src/index.js";

test("IntroOutroSelectionSchema parses all valid modes including motion_template", () => {
  const builtin = IntroOutroSelectionSchema.parse({ mode: "style_builtin" });
  assert.equal(builtin.mode, "style_builtin");

  const specific = IntroOutroSelectionSchema.parse({
    mode: "specific_pair",
    style_id: "style_custom_123",
  });
  assert.equal(specific.mode, "specific_pair");
  if (specific.mode === "specific_pair") {
    assert.equal(specific.style_id, "style_custom_123");
  }

  const none = IntroOutroSelectionSchema.parse({ mode: "none" });
  assert.equal(none.mode, "none");

  const motionDefault = IntroOutroSelectionSchema.parse({
    mode: "motion_template",
    template_id: "kinetic_punch",
  });
  assert.equal(motionDefault.mode, "motion_template");
  if (motionDefault.mode === "motion_template") {
    assert.equal(motionDefault.template_id, "kinetic_punch");
    assert.equal(motionDefault.options, undefined);
  }

  const motionWithOptions = IntroOutroSelectionSchema.parse({
    mode: "motion_template",
    template_id: "cyber_neon",
    options: {
      accentColor: "#00ffcc",
      headlineText: "READY TO PLAY?",
      showMascot: true,
      soundEffectCue: true,
      customParameters: {
        gridSpeed: 1.5,
        scanlines: true,
      },
    },
  });
  assert.equal(motionWithOptions.mode, "motion_template");
  if (motionWithOptions.mode === "motion_template") {
    assert.equal(motionWithOptions.options?.accentColor, "#00ffcc");
    assert.equal(motionWithOptions.options?.showMascot, true);
    assert.equal(motionWithOptions.options?.customParameters?.gridSpeed, 1.5);
  }
});

test("IntroOutroSelectionSchema rejects invalid configurations", () => {
  assert.throws(() => {
    IntroOutroSelectionSchema.parse({ mode: "invalid_mode" });
  });

  assert.throws(() => {
    IntroOutroSelectionSchema.parse({ mode: "motion_template", template_id: "" });
  });

  assert.throws(() => {
    IntroOutroSelectionSchema.parse({ mode: "specific_pair", style_id: "" });
  });
});

test("QuizConfigSchema preserves backwards compatibility and defaults", () => {
  const defaultCfg = QuizConfigSchema.parse({});
  assert.deepEqual(defaultCfg.intro_outro_selection, { mode: "style_builtin" });

  const customCfg = QuizConfigSchema.parse({
    intro_outro_selection: {
      mode: "motion_template",
      template_id: "minimal_sleek",
      options: { accentColor: "#ff007f" },
    },
  });
  assert.equal(customCfg.intro_outro_selection?.mode, "motion_template");
});

test("Motion template domain enums validate correctly", () => {
  assert.equal(MotionTemplatePlacementSchema.parse("intro"), "intro");
  assert.equal(MotionTemplatePlacementSchema.parse("outro"), "outro");
  assert.equal(MotionTemplatePlacementSchema.parse("both"), "both");

  assert.equal(MotionTemplateCategorySchema.parse("kinetic"), "kinetic");
  assert.equal(MotionTemplateCategorySchema.parse("cyber"), "cyber");
  assert.equal(MotionTemplateCategorySchema.parse("minimal"), "minimal");
  assert.equal(MotionTemplateCategorySchema.parse("gamified"), "gamified");

  assert.equal(MotionTemplateIdSchema.parse("kinetic_punch"), "kinetic_punch");
  assert.equal(MotionTemplateIdSchema.parse("cyber_neon"), "cyber_neon");
  assert.equal(MotionTemplateIdSchema.parse("minimal_sleek"), "minimal_sleek");
  assert.equal(MotionTemplateIdSchema.parse("interactive_cta"), "interactive_cta");
  assert.equal(MotionTemplateIdSchema.parse("scorecard_recap"), "scorecard_recap");
});

test("MotionTemplateRegistry lists and filters templates cleanly", () => {
  const allTemplates = listMotionTemplates();
  assert.equal(allTemplates.length, BUILT_IN_MOTION_TEMPLATES.length);
  assert.ok(allTemplates.length >= 5);

  for (const tmpl of allTemplates) {
    MotionTemplateDefinitionSchema.parse(tmpl);
  }

  const introOnly = listMotionTemplates("intro");
  assert.ok(introOnly.some((t) => t.id === "kinetic_punch"));
  assert.ok(introOnly.some((t) => t.id === "cyber_neon"));
  assert.ok(introOnly.some((t) => t.id === "minimal_sleek")); // 'both' placement included

  const outroOnly = listMotionTemplates("outro");
  assert.ok(outroOnly.some((t) => t.id === "interactive_cta"));
  assert.ok(outroOnly.some((t) => t.id === "scorecard_recap"));
  assert.ok(outroOnly.some((t) => t.id === "minimal_sleek")); // 'both' placement included
});

test("getMotionTemplateDefinition returns defensive copies and handles missing keys", () => {
  const kinetic = getMotionTemplateDefinition("kinetic_punch");
  assert.ok(kinetic);
  assert.equal(kinetic.name, "Kinetic Punch");

  kinetic.name = "Mutated Name";
  const fresh = getMotionTemplateDefinition("kinetic_punch");
  assert.equal(fresh?.name, "Kinetic Punch");

  assert.equal(getMotionTemplateDefinition("non_existent_template"), undefined);
});

test("isValidMotionTemplateId accurately identifies registered IDs", () => {
  assert.equal(isValidMotionTemplateId("kinetic_punch"), true);
  assert.equal(isValidMotionTemplateId("cyber_neon"), true);
  assert.equal(isValidMotionTemplateId("minimal_sleek"), true);
  assert.equal(isValidMotionTemplateId("interactive_cta"), true);
  assert.equal(isValidMotionTemplateId("scorecard_recap"), true);
  assert.equal(isValidMotionTemplateId("unknown_template"), false);
  assert.equal(isValidMotionTemplateId(""), false);
});
