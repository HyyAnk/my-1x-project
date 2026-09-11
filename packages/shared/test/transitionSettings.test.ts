import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import { resolveTransitionSettings } from "../src/transitions/transitionSettings.js";

describe("Transition Settings Precedence (Task 1)", () => {
  it("prioritizes draft over explicit, preset, channel, and default", () => {
    const settings = resolveTransitionSettings({
      draft: { scene: { id: "brush_wave", durationSeconds: 0.9 } },
      explicit: { scene: { id: "lightning_brush", durationSeconds: 0.8 } },
      preset: { scene: { id: "bubble_splash", durationSeconds: 0.7 } },
    });

    assert.equal(settings.scene.id, "brush_wave");
    assert.equal(settings.scene.durationSeconds, 0.9);
  });

  it("prioritizes explicit director selection over preset", () => {
    const settings = resolveTransitionSettings({
      explicit: { scene: { id: "lightning_brush", durationSeconds: 0.8 } },
      preset: { scene: { id: "bubble_splash", durationSeconds: 0.7 } },
    });

    assert.equal(settings.scene.id, "lightning_brush");
    assert.equal(settings.scene.durationSeconds, 0.8);
  });

  it("allows 'auto' to fall through to the next precedence tier", () => {
    const settings = resolveTransitionSettings({
      explicit: { scene: { id: "auto" } },
      preset: { scene: { id: "bubble_splash", durationSeconds: 0.6 } },
    });

    assert.equal(settings.scene.id, "bubble_splash");
    assert.equal(settings.scene.durationSeconds, 0.6);
  });

  it("pairs ID and duration from the winning source and never combines disparate sources", () => {
    const settings = resolveTransitionSettings({
      explicit: { scene: { id: "brush_wave" } }, // duration not specified on explicit
      preset: { scene: { id: "bubble_splash", durationSeconds: 1.2 } },
    });

    assert.equal(settings.scene.id, "brush_wave");
    // Should NOT borrow 1.2s from the preset!
    assert.equal(settings.scene.durationSeconds, undefined);
  });

  it("resolves default intro and scene transitions when no sources provide them", () => {
    const settings = resolveTransitionSettings({});
    assert.equal(settings.intro.id, "stinger_swipe");
    assert.equal(settings.scene.id, "bubble_splash");
  });
});
