import assert from "node:assert/strict";
import nodeTest from "node:test";
import { TRANSITION_STYLES_CSS, getTransitionStylesCss, injectTransitionStyles } from "../src/index.js";

void nodeTest("Unified Shared CSS Motion Engine - TRANSITION_STYLES_CSS export", () => {
  assert.equal(typeof TRANSITION_STYLES_CSS, "string");
  assert.ok(TRANSITION_STYLES_CSS.length > 500);

  // Standardized custom properties
  assert.ok(TRANSITION_STYLES_CSS.includes("--trans-dur"));
  assert.ok(TRANSITION_STYLES_CSS.includes("--trans-start"));
  assert.ok(TRANSITION_STYLES_CSS.includes("--trans-from-color"));
  assert.ok(TRANSITION_STYLES_CSS.includes("--trans-to-color"));

  // Stinger swipe transition classes and keyframes
  assert.ok(TRANSITION_STYLES_CSS.includes(".transition-stinger"));
  assert.ok(TRANSITION_STYLES_CSS.includes(".stinger-slash"));
  assert.ok(TRANSITION_STYLES_CSS.includes(".stinger-flash"));
  assert.ok(TRANSITION_STYLES_CSS.includes("@keyframes stinger-wipe"));
  assert.ok(TRANSITION_STYLES_CSS.includes("@keyframes stinger-flash-burst"));

  // Crossfade transition
  assert.ok(TRANSITION_STYLES_CSS.includes(".transition-crossfade"));
  assert.ok(TRANSITION_STYLES_CSS.includes("@keyframes crossfade-out"));

  // Swipe transition
  assert.ok(TRANSITION_STYLES_CSS.includes(".transition-swipe"));
  assert.ok(TRANSITION_STYLES_CSS.includes(".swipe-curtain"));
  assert.ok(TRANSITION_STYLES_CSS.includes("@keyframes swipe-in"));

  // Cut transition
  assert.ok(TRANSITION_STYLES_CSS.includes(".transition-cut"));

  // Base wrappers
  assert.ok(TRANSITION_STYLES_CSS.includes(".intro-transition"));
  assert.ok(TRANSITION_STYLES_CSS.includes(".candy-transition { position: absolute; z-index: var(--candy-layer-transition);"));

  // Scene transitions and keyframes
  assert.ok(TRANSITION_STYLES_CSS.includes(".transition-bubble_splash"));
  assert.ok(TRANSITION_STYLES_CSS.includes(".splash-brand"));
  assert.ok(TRANSITION_STYLES_CSS.includes(".splash-bubble"));
  assert.ok(TRANSITION_STYLES_CSS.includes(".brush"));
  assert.ok(TRANSITION_STYLES_CSS.includes(".transition-lightning_brush"));
  assert.ok(TRANSITION_STYLES_CSS.includes("@keyframes brush-wave"));
  assert.ok(TRANSITION_STYLES_CSS.includes("@keyframes mark-pop"));
  assert.ok(TRANSITION_STYLES_CSS.includes("@keyframes bubble-splash-attack"));
  assert.ok(TRANSITION_STYLES_CSS.includes("@keyframes splash-brand-hit"));
});

void nodeTest("Unified Shared CSS Motion Engine - getTransitionStylesCss helper", () => {
  const css = getTransitionStylesCss();
  assert.equal(css, TRANSITION_STYLES_CSS);
});

void nodeTest("Unified Shared CSS Motion Engine - injectTransitionStyles helper", () => {
  // Gracefully handles undefined document in non-DOM environments
  assert.doesNotThrow(() => {
    injectTransitionStyles(undefined);
  });

  // Injects into mock document
  const createdElements: Array<{ id: string; textContent: string }> = [];
  const mockDoc = {
    head: {
      appendChild(node: { id: string; textContent: string }) {
        createdElements.push(node);
      },
    },
    getElementById(id: string) {
      return createdElements.find((el) => el.id === id) || null;
    },
    createElement(tag: string) {
      assert.equal(tag, "style");
      return { id: "", textContent: "" };
    },
  } as unknown as Document;

  injectTransitionStyles(mockDoc);
  assert.equal(createdElements.length, 1);
  assert.equal(createdElements[0].id, "studio-transition-motion-engine");
  assert.equal(createdElements[0].textContent, TRANSITION_STYLES_CSS);

  // Idempotent: second injection should not create duplicate element
  injectTransitionStyles(mockDoc);
  assert.equal(createdElements.length, 1);
});
