import { describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import {
  adaptMascotForPhase,
  adaptMascotForQuestion,
  buildBundleActionV2,
  buildLegacySpriteAction,
  DEFAULT_ACTION_REGISTRATION,
  hasDedicatedAction,
  resolveMascotQuestionStyle,
} from "../src/quiz/render/mascot/productionMascotStateAdapter.js";
import * as adapterBarrel from "../src/quiz/render/mascot/adapter/index.js";

const createMockMascot = (): MascotProfile => ({
  id: "test_mascot_01",
  name: "Mascot Bot",
  active_style_id: "core",
  master_image_url: "https://example.com/master.png",
  actions: {
    idle: {
      action: "idle",
      sprite_url: "https://example.com/idle.png",
      preview_url: "https://example.com/idle.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "idle",
      motion_speed: 1,
      motion_intensity: "normal",
    },
  },
  styles: [
    {
      id: "core",
      name: "Core Style",
      is_default: true,
      states: {
        thinking: [
          {
            slot_index: 1,
            image_url: "https://example.com/think1.png",
          },
        ],
        celebrate: [
          {
            slot_index: 1,
            image_url: "https://example.com/celeb1.png",
          },
        ],
      },
    },
    {
      id: "secondary",
      name: "Secondary Style",
      is_default: false,
      anchor_image_url: "https://example.com/sec_anchor.png",
      states: {
        thinking: [],
        celebrate: [],
      },
    },
  ],
  render_bundle: {
    config: {
      version: 2,
      placements: {
        "16:9": { anchor: "bottom_right", scale: 1, offset_x: 0, offset_y: 0, flip_x: false },
        "9:16": { anchor: "bottom_right", scale: 1, offset_x: 0, offset_y: 0, flip_x: false },
      },
      visibility: {
        enabled: true,
        phase_rules: {
          intro: { visible: true, action: "wave" },
          question: { visible: true, action: "idle" },
          choices: { visible: true, action: "thinking" },
          thinking: { visible: true, action: "thinking" },
          reveal: { visible: true, action: "celebrate" },
          explain: { visible: true, action: "thinking" },
          outro: { visible: true, action: "outro" },
        },
        reveal_outcome_actions: { correct: "celebrate", wrong: "oops", timeout: "oops" },
      },
    },
    assets: {
      actions: {
        idle: {
          version: 2,
          action: "idle",
          image_url: "https://example.com/idle.png",
          registration: DEFAULT_ACTION_REGISTRATION,
          motion: { preset: "idle", speed: 1, intensity: "normal" },
        },
      },
      master: { image_url: "https://example.com/master.png", registration: DEFAULT_ACTION_REGISTRATION },
    },
  },
});

describe("Mascot State Adapter Modular Architecture", () => {
  it("exports all expected symbols from the facade and adapter barrel with identical identity", () => {
    expect(adapterBarrel.buildLegacySpriteAction).toBe(buildLegacySpriteAction);
    expect(adapterBarrel.buildBundleActionV2).toBe(buildBundleActionV2);
    expect(adapterBarrel.DEFAULT_ACTION_REGISTRATION).toBe(DEFAULT_ACTION_REGISTRATION);
    expect(adapterBarrel.resolveMascotQuestionStyle).toBe(resolveMascotQuestionStyle);
    expect(adapterBarrel.hasDedicatedAction).toBe(hasDedicatedAction);
    expect(adapterBarrel.adaptMascotForQuestion).toBe(adaptMascotForQuestion);
    expect(adapterBarrel.adaptMascotForPhase).toBe(adaptMascotForPhase);
  });

  describe("mascotV1ActionBuilder", () => {
    it("assembles a legacy sprite action with sensible defaults", () => {
      const action = buildLegacySpriteAction("thinking", "https://example.com/think.png", "sway");
      expect(action.action).toBe("thinking");
      expect(action.sprite_url).toBe("https://example.com/think.png");
      expect(action.motion_preset).toBe("sway");
      expect(action.motion_speed).toBe(1.0);
      expect(action.motion_intensity).toBe("normal");
      expect(action.fps).toBe(8);
      expect(action.loop).toBe(true);
    });

    it("inherits frame and offset properties from existing action when provided", () => {
      const existing = buildLegacySpriteAction("thinking", "https://example.com/old.png", "bounce");
      existing.frames_count = 12;
      existing.fps = 24;
      existing.offset_x = 42;

      const action = buildLegacySpriteAction("thinking", "https://example.com/new.png", "sway", 1.5, "amplified", existing);
      expect(action.frames_count).toBe(12);
      expect(action.fps).toBe(24);
      expect(action.offset_x).toBe(42);
      expect(action.motion_speed).toBe(1.5);
      expect(action.motion_intensity).toBe("amplified");
    });
  });

  describe("mascotV2BundleBuilder", () => {
    it("assembles a v2 bundle action conforming to DEFAULT_ACTION_REGISTRATION", () => {
      const bundleAction = buildBundleActionV2("celebrate", "https://example.com/celeb.png", "jump");
      expect(bundleAction.version).toBe(2);
      expect(bundleAction.action).toBe("celebrate");
      expect(bundleAction.image_url).toBe("https://example.com/celeb.png");
      expect(bundleAction.motion.preset).toBe("jump");
      expect(bundleAction.registration).toEqual(DEFAULT_ACTION_REGISTRATION);
    });
  });

  describe("mascotQuestionVariantSelector", () => {
    it("resolves cycle styles correctly when requested", () => {
      const mascot = createMockMascot();
      const style0 = resolveMascotQuestionStyle(mascot, "cycle", 0);
      const style1 = resolveMascotQuestionStyle(mascot, "cycle", 1);
      expect(style0.id).toBe("core");
      expect(style1.id).toBe("secondary");
    });

    it("adapts mascot render bundle for question state without mutating legacy sprite actions", () => {
      const mascot = createMockMascot();
      const adapted = adaptMascotForQuestion(mascot, "core", 0);
      expect(adapted).toBeDefined();
      expect(adapted?.active_style_id).toBe("core");
      expect(adapted?.actions?.thinking).toBeUndefined();
      expect(adapted?.actions?.celebrate).toBeUndefined();
      expect(adapted?.actions?.idle?.sprite_url).toBe("https://example.com/idle.png");
      expect(adapted?.render_bundle?.assets?.actions?.thinking?.image_url).toBe("https://example.com/think1.png");
      expect(adapted?.render_bundle?.assets?.actions?.celebrate?.image_url).toBe("https://example.com/celeb1.png");
    });

    it("adapts mascot render bundle with secondary style anchor and asserts active style id", () => {
      const mascot = createMockMascot();
      const adapted = adaptMascotForQuestion(mascot, "secondary", 0);
      expect(adapted).toBeDefined();
      expect(adapted?.active_style_id).toBe("secondary");
      expect(adapted?.actions?.thinking).toBeUndefined();
      expect(adapted?.actions?.celebrate).toBeUndefined();
      expect(adapted?.render_bundle?.assets?.actions?.thinking?.image_url).toBe("https://example.com/sec_anchor.png");
      expect(adapted?.render_bundle?.assets?.actions?.celebrate?.image_url).toBe("https://example.com/sec_anchor.png");
    });
  });

  describe("mascotPhaseFallbackResolver", () => {
    it("evaluates hasDedicatedAction accurately", () => {
      const mascot = createMockMascot();
      expect(hasDedicatedAction(mascot, "idle")).toBe(true);
      expect(hasDedicatedAction(mascot, "wave")).toBe(false);
    });

    it("applies fallback for intro phase when wave action is absent", () => {
      const mascot = createMockMascot();
      const adaptedIntro = adaptMascotForPhase(mascot, "intro", "core");
      expect(adaptedIntro?.render_bundle?.assets?.actions?.wave).toBeDefined();
      expect(adaptedIntro?.render_bundle?.assets?.actions?.wave?.image_url).toBe("https://example.com/celeb1.png");
      expect(adaptedIntro?.active_style_id).toBe("core");
      expect(adaptedIntro?.actions?.wave).toBeUndefined();
    });

    it("applies fallback for outro phase when outro action is absent", () => {
      const mascot = createMockMascot();
      const adaptedOutro = adaptMascotForPhase(mascot, "outro", "core");
      expect(adaptedOutro?.render_bundle?.assets?.actions?.outro).toBeDefined();
      expect(adaptedOutro?.render_bundle?.assets?.actions?.outro?.image_url).toBe("https://example.com/celeb1.png");
      expect(adaptedOutro?.active_style_id).toBe("core");
      expect(adaptedOutro?.actions?.outro).toBeUndefined();
    });
  });
});
