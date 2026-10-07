import assert from "node:assert/strict";
import test from "node:test";
import {
  energySlashTransition,
  getTransition,
  getTransitionDefinition,
  isValidTransition,
  listTransitions,
  morphWipeTransition,
  registerMotionTransitions,
  resetTransitionCatalog,
  resetTransitionRegistry,
} from "../src/index.js";

test("Motion Transitions - Definitions and Markup", () => {
  assert.equal(morphWipeTransition.id, "morph_wipe");
  assert.equal(morphWipeTransition.name, "Morph Wipe");
  assert.ok(morphWipeTransition.placements.includes("intro"));
  assert.ok(morphWipeTransition.placements.includes("scene"));

  const morphMarkup = morphWipeTransition.renderMarkup({
    fromColor: "#123456",
    toColor: "#abcdef",
  });
  assert.ok(morphMarkup.includes("transition-morph-wipe"));
  assert.ok(morphMarkup.includes("--trans-from-color:#123456"));
  assert.ok(morphMarkup.includes("--trans-to-color:#abcdef"));

  assert.equal(energySlashTransition.id, "energy_slash");
  assert.equal(energySlashTransition.name, "Energy Slash");
  assert.ok(energySlashTransition.placements.includes("intro"));
  assert.ok(energySlashTransition.placements.includes("scene"));

  const slashMarkup = energySlashTransition.renderMarkup({
    fromColor: "#ff007f",
    toColor: "#00ffff",
  });
  assert.ok(slashMarkup.includes("transition-energy-slash"));
  assert.ok(slashMarkup.includes("blade-cyan"));
  assert.ok(slashMarkup.includes("blade-magenta"));
});

test("Motion Transitions - Dynamic Registration", () => {
  resetTransitionCatalog();
  resetTransitionRegistry();

  // Before registration
  assert.equal(isValidTransition("morph_wipe"), false);
  assert.equal(isValidTransition("energy_slash"), false);

  // Register motion transitions
  registerMotionTransitions();

  assert.equal(isValidTransition("morph_wipe"), true);
  assert.equal(isValidTransition("morph_wipe", "intro_outro"), true);
  assert.equal(isValidTransition("morph_wipe", "scene"), true);

  assert.equal(isValidTransition("energy_slash"), true);
  assert.equal(isValidTransition("energy_slash", "intro_outro"), true);
  assert.equal(isValidTransition("energy_slash", "scene"), true);

  const morphDef = getTransition("morph_wipe");
  assert.ok(morphDef);
  assert.equal(morphDef.category, "universal");

  const slashImpl = getTransitionDefinition("energy_slash");
  assert.ok(slashImpl);
  assert.equal(slashImpl.name, "Energy Slash");

  // Clean up
  resetTransitionCatalog();
  resetTransitionRegistry();
});
