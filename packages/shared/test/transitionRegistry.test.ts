import assert from "node:assert/strict";
import nodeTest, { beforeEach } from "node:test";
import { ZodError } from "zod";
import {
  CORE_TRANSITIONS,
  getTransition,
  isValidTransition,
  listTransitions,
  registerTransition,
  resetTransitionRegistry,
  TransitionCategorySchema,
  TransitionDefinitionSchema,
  type TransitionDefinition,
} from "../src/index.js";

beforeEach(() => {
  resetTransitionRegistry();
});

void nodeTest("Centralized Transition Registry - Core Transitions Initialization", () => {
  assert.equal(CORE_TRANSITIONS.length, 6);

  const introOutroTransitions = listTransitions("intro_outro");
  assert.equal(introOutroTransitions.length, 3);
  const introOutroIds = introOutroTransitions.map((t) => t.id);
  assert.deepEqual(introOutroIds.sort(), ["crossfade", "cut", "stinger_swipe"].sort());

  const sceneTransitions = listTransitions("scene");
  assert.equal(sceneTransitions.length, 3);
  const sceneIds = sceneTransitions.map((t) => t.id);
  assert.deepEqual(sceneIds.sort(), ["brush_wave", "bubble_splash", "lightning_brush"].sort());

  const all = listTransitions();
  assert.equal(all.length, 6);
});

void nodeTest("Centralized Transition Registry - getTransition retrieves expected definitions", () => {
  const stinger = getTransition("stinger_swipe");
  assert.ok(stinger);
  assert.equal(stinger.id, "stinger_swipe");
  assert.equal(stinger.name, "Stinger Swipe");
  assert.equal(stinger.category, "intro_outro");
  assert.equal(stinger.defaultDuration, 0.5);
  assert.equal(stinger.minDuration, 0.2);
  assert.equal(stinger.maxDuration, 1.5);
  assert.equal(stinger.cssClass, "transition-stinger");
  assert.equal(stinger.tag, "Recommended");
  assert.equal(stinger.iconName, "Lightning");

  const crossfade = getTransition("crossfade");
  assert.ok(crossfade);
  assert.equal(crossfade.id, "crossfade");
  assert.equal(crossfade.category, "intro_outro");
  assert.equal(crossfade.defaultDuration, 0.5);
  assert.equal(crossfade.cssClass, "transition-crossfade");
  assert.equal(crossfade.tag, "Cinematic");
  assert.equal(crossfade.iconName, "Sparkle");

  const cut = getTransition("cut");
  assert.ok(cut);
  assert.equal(cut.id, "cut");
  assert.equal(cut.category, "intro_outro");
  assert.equal(cut.defaultDuration, 0.0);
  assert.equal(cut.minDuration, 0.0);
  assert.equal(cut.maxDuration, 0.0);
  assert.equal(cut.cssClass, "transition-cut");
  assert.equal(cut.tag, "Minimal");
  assert.equal(cut.iconName, "Play");

  const bubble = getTransition("bubble_splash");
  assert.ok(bubble);
  assert.equal(bubble.id, "bubble_splash");
  assert.equal(bubble.category, "scene");
  assert.equal(bubble.defaultDuration, 0.86);
  assert.equal(bubble.cssClass, "transition-bubble_splash");

  const unknown = getTransition("non_existent_transition");
  assert.equal(unknown, undefined);
});

void nodeTest("Centralized Transition Registry - getTransition returns defensive copies", () => {
  const stinger1 = getTransition("stinger_swipe");
  assert.ok(stinger1);
  stinger1.name = "Modified Name";

  const stinger2 = getTransition("stinger_swipe");
  assert.ok(stinger2);
  assert.equal(stinger2.name, "Stinger Swipe");
});

void nodeTest("Centralized Transition Registry - isValidTransition category checks", () => {
  assert.equal(isValidTransition("stinger_swipe"), true);
  assert.equal(isValidTransition("stinger_swipe", "intro_outro"), true);
  assert.equal(isValidTransition("stinger_swipe", "scene"), false);

  assert.equal(isValidTransition("bubble_splash"), true);
  assert.equal(isValidTransition("bubble_splash", "scene"), true);
  assert.equal(isValidTransition("bubble_splash", "intro_outro"), false);

  assert.equal(isValidTransition("non_existent"), false);
  assert.equal(isValidTransition("non_existent", "intro_outro"), false);
});

void nodeTest("Centralized Transition Registry - registerTransition dynamic extension", () => {
  const customScene: TransitionDefinition = {
    id: "zoom_blur",
    name: "Zoom Blur",
    description: "High speed cinematic zoom blur between questions.",
    category: "scene",
    defaultDuration: 0.6,
    minDuration: 0.3,
    maxDuration: 1.2,
    cssClass: "transition-zoom-blur",
    tag: "Action",
    iconName: "ArrowsOut",
  };

  registerTransition(customScene);
  assert.equal(isValidTransition("zoom_blur"), true);
  assert.equal(isValidTransition("zoom_blur", "scene"), true);
  assert.equal(isValidTransition("zoom_blur", "intro_outro"), false);

  const retrieved = getTransition("zoom_blur");
  assert.ok(retrieved);
  assert.equal(retrieved.id, "zoom_blur");
  assert.equal(retrieved.name, "Zoom Blur");

  assert.equal(listTransitions("scene").length, 4);
});

void nodeTest("Centralized Transition Registry - Universal category transitions", () => {
  const universalTransition: TransitionDefinition = {
    id: "pixel_dissolve",
    name: "Pixel Dissolve",
    description: "Retro digital dissolve usable anywhere.",
    category: "universal",
    defaultDuration: 0.5,
    minDuration: 0.1,
    maxDuration: 1.0,
    cssClass: "transition-pixel-dissolve",
  };

  registerTransition(universalTransition);

  assert.equal(isValidTransition("pixel_dissolve", "intro_outro"), true);
  assert.equal(isValidTransition("pixel_dissolve", "scene"), true);
  assert.equal(isValidTransition("pixel_dissolve", "universal"), true);

  const introTransitions = listTransitions("intro_outro");
  assert.ok(introTransitions.some((t) => t.id === "pixel_dissolve"));

  const sceneTransitions = listTransitions("scene");
  assert.ok(sceneTransitions.some((t) => t.id === "pixel_dissolve"));
});

void nodeTest("Centralized Transition Registry - Validation rejects invalid configurations", () => {
  assert.throws(
    () => {
      registerTransition({
        id: "invalid_duration",
        name: "Invalid Duration",
        description: "min > max duration",
        category: "scene",
        defaultDuration: 0.5,
        minDuration: 1.0,
        maxDuration: 0.5,
        cssClass: "transition-invalid",
      });
    },
    (err: unknown) => err instanceof ZodError,
  );

  assert.throws(
    () => {
      registerTransition({
        id: "default_out_of_bounds",
        name: "Default Out of Bounds",
        description: "default < min",
        category: "scene",
        defaultDuration: 0.1,
        minDuration: 0.2,
        maxDuration: 1.0,
        cssClass: "transition-invalid",
      });
    },
    (err: unknown) => err instanceof ZodError,
  );

  assert.throws(
    () => {
      // @ts-expect-error test invalid category
      registerTransition({
        id: "invalid_category",
        name: "Invalid Category",
        description: "bogus category",
        category: "unknown_category",
        defaultDuration: 0.5,
        minDuration: 0.2,
        maxDuration: 1.0,
        cssClass: "transition-invalid",
      });
    },
    (err: unknown) => err instanceof ZodError,
  );
});

void nodeTest("Centralized Transition Registry - resetTransitionRegistry cleans state", () => {
  registerTransition({
    id: "temporary_transition",
    name: "Temporary",
    description: "Will be reset.",
    category: "scene",
    defaultDuration: 0.5,
    minDuration: 0.2,
    maxDuration: 1.0,
    cssClass: "transition-temp",
  });

  assert.equal(isValidTransition("temporary_transition"), true);
  resetTransitionRegistry();
  assert.equal(isValidTransition("temporary_transition"), false);
  assert.equal(listTransitions().length, 6);
});

void nodeTest("Centralized Transition Registry - TransitionCategorySchema parsing", () => {
  assert.equal(TransitionCategorySchema.parse("intro_outro"), "intro_outro");
  assert.equal(TransitionCategorySchema.parse("scene"), "scene");
  assert.equal(TransitionCategorySchema.parse("universal"), "universal");
  assert.throws(() => TransitionCategorySchema.parse("other"));
});

void nodeTest("Centralized Transition Registry - TransitionDefinitionSchema direct validation", () => {
  const valid = TransitionDefinitionSchema.parse({
    id: "test",
    name: "Test",
    description: "A test transition",
    category: "intro_outro",
    defaultDuration: 0.5,
    minDuration: 0.2,
    maxDuration: 1.0,
    cssClass: "transition-test",
  });
  assert.equal(valid.id, "test");
});
