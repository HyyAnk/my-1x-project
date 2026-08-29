import { describe, expect, it } from "vitest";
import {
  adaptMascotV1ToV2,
  normalizeMascotRenderPhase,
  resolveMascotMotionTransform,
  resolveMascotRenderGeometry,
  resolveMascotRenderSpec,
  type MascotProfile,
  type MascotSpriteAction,
} from "@studio/shared";

function action(actionName: MascotSpriteAction["action"], url: string, overrides: Partial<MascotSpriteAction> = {}): MascotSpriteAction {
  return {
    action: actionName,
    sprite_url: url,
    frames_count: 1,
    fps: 8,
    loop: true,
    frame_width: 512,
    frame_height: 512,
    offset_x: 0,
    offset_y: 0,
    ...overrides,
  };
}

function mascot(actions: MascotProfile["actions"] = {}): MascotProfile {
  return {
    id: "engine-mascot",
    name: "Engine Mascot",
    description: "Core engine fixture",
    visual_style: "pixar_3d",
    master_prompt: "Core engine fixture",
    master_image_url: "/assets/master.png",
    color_theme: "#06b6d4",
    actions,
    assigned_channel_ids: [],
    created_at: "2026-08-29T00:00:00.000Z",
    updated_at: "2026-08-29T00:00:00.000Z",
  };
}

function context(
  phase: "intro" | "question" | "choices" | "thinking" | "reveal" | "explain" | "outro",
  reveal_outcome = null as "correct" | "wrong" | "timeout" | null,
) {
  return { aspect_ratio: "16:9" as const, phase, reveal_outcome, timeline_time_seconds: 2.5, playing: true };
}

describe("Mascot V2 core engine", () => {
  it("adapts V1 placement, action metadata, and both aspect ratios", () => {
    const bundle = adaptMascotV1ToV2(
      mascot({
        thinking: action("thinking", "/assets/thinking.png", { offset_x: 12, offset_y: -8, motion_preset: "sway", motion_speed: 1.4 }),
      }),
      {
        enabled: true,
        position: "bottom_right",
        scale: 1.84,
        offset_x: 21,
        offset_y: 90,
        show_in_intro: true,
        show_in_outro: false,
        show_in_question: true,
      },
    );

    expect(bundle).not.toBeNull();
    expect(bundle?.config.placements["16:9"]).toEqual(bundle?.config.placements["9:16"]);
    expect(bundle?.config.placements["16:9"]).toMatchObject({
      anchor: "bottom_right",
      scale: 1.84,
      offset_x: 21,
      offset_y: 90,
      flip_x: false,
    });
    expect(bundle?.assets.actions.thinking).toMatchObject({
      action: "thinking",
      image_url: "/assets/thinking.png",
      registration: { source_width: 512, source_height: 512, offset_x: 12, offset_y: -8 },
      motion: { preset: "sway", speed: 1.4, intensity: "normal" },
    });
  });

  it("keeps legacy strips explicitly marked and clamps unsafe V1 values", () => {
    const bundle = adaptMascotV1ToV2(
      mascot({
        wave: action("wave", "/assets/wave-strip.png", {
          frames_count: 20,
          frame_width: 1000,
          frame_height: 600,
          fps: 240,
          motion_speed: 99,
          offset_x: 5000,
        }),
      }),
      { scale: 99, offset_y: -5000 },
    );

    expect(bundle?.config.placements["16:9"].scale).toBe(3);
    expect(bundle?.config.placements["16:9"].offset_y).toBe(-1500);
    expect(bundle?.assets.actions.wave?.legacy_animation).toMatchObject({
      frames_count: 8,
      fps: 120,
      frame_width: 1000,
      frame_height: 600,
    });
    expect(bundle?.assets.actions.wave?.registration.source_width).toBe(8000);
    expect(bundle?.assets.actions.wave?.motion.speed).toBe(5);
  });

  it("resolves phase visibility, reveal outcomes, and fallback metadata", () => {
    const bundle = adaptMascotV1ToV2(
      mascot({
        wave: action("wave", "/assets/wave.png", { offset_x: 7, motion_preset: "wave", motion_speed: 1.8, motion_intensity: "dynamic" }),
        thinking: action("thinking", "/assets/thinking.png", { motion_preset: "sway" }),
        oops: action("oops", "/assets/oops.png", { motion_preset: "shake" }),
      }),
      { show_in_intro: false, show_in_outro: true, show_in_question: true },
    );
    if (!bundle) throw new Error("Expected mascot bundle");

    expect(resolveMascotRenderSpec(bundle, context("intro"))).toBeNull();
    expect(resolveMascotRenderSpec(bundle, context("question"))?.asset.action).toBe("thinking");
    expect(resolveMascotRenderSpec(bundle, context("reveal", "correct"))?.asset.action).toBe("wave");
    expect(resolveMascotRenderSpec(bundle, context("reveal", "correct"))?.motion).toMatchObject({
      preset: "wave",
      speed: 1.8,
      intensity: "dynamic",
    });
    expect(resolveMascotRenderSpec(bundle, context("reveal", "wrong"))?.asset.action).toBe("oops");
    expect(resolveMascotRenderSpec(bundle, context("outro"))?.asset.action).toBe("wave");
    expect(resolveMascotRenderSpec(bundle, { ...context("thinking"), action_override: "surprised" })?.asset.action).toBe("oops");
  });

  it("normalizes the legacy explanation phase name", () => {
    expect(normalizeMascotRenderPhase("explanation")).toBe("explain");
    expect(normalizeMascotRenderPhase("question")).toBe("question");
  });

  it("falls back to the master image and honours disabled policy", () => {
    const bundle = adaptMascotV1ToV2(mascot(), { enabled: false, show_in_question: true });
    if (!bundle) throw new Error("Expected mascot bundle");
    expect(resolveMascotRenderSpec(bundle, context("thinking"))).toBeNull();

    const enabledBundle = adaptMascotV1ToV2(mascot(), { enabled: true, show_in_question: true });
    if (!enabledBundle) throw new Error("Expected enabled mascot bundle");
    const spec = resolveMascotRenderSpec(enabledBundle, context("reveal", "timeout"));
    expect(spec?.asset).toMatchObject({ action: "oops", image_url: "/assets/master.png", motion: { preset: "shake" } });
  });

  it("uses canonical scale, anchor, registration, and flip geometry", () => {
    const bundle = adaptMascotV1ToV2(mascot({ thinking: action("thinking", "/assets/thinking.png", { offset_x: 10, offset_y: -4 }) }), {
      position: "bottom_left",
      scale: 2,
      offset_x: 10,
      offset_y: 5,
      show_in_question: true,
    });
    if (!bundle) throw new Error("Expected mascot bundle");
    const spec = resolveMascotRenderSpec(bundle, context("thinking"));
    if (!spec) throw new Error("Expected render spec");

    const geometry = resolveMascotRenderGeometry(spec);
    expect(geometry.box_width).toBeCloseTo(440);
    expect(geometry.box_height).toBeCloseTo(440);
    expect(geometry.pivot_x).toBeCloseTo(120);
    expect(geometry.pivot_y).toBeCloseTo(1085);
    expect(geometry.visible_content.x).toBeCloseTo(-100 + 10);
    expect(geometry.visible_content.y).toBeCloseTo(645 - 4);

    const flipped = resolveMascotRenderGeometry({ ...spec, placement: { ...spec.placement, flip_x: true } });
    expect(flipped.flip_x).toBe(true);
    expect(flipped.box_width).toBeCloseTo(geometry.box_width);
  });

  it("produces deterministic motion with explicit speed and intensity", () => {
    const motion = { preset: "sway" as const, speed: 1.25, intensity: "normal" as const };
    const first = resolveMascotMotionTransform(motion, 0.75);
    const second = resolveMascotMotionTransform(motion, 0.75);
    expect(first).toEqual(second);
    expect(first).not.toEqual({ translate_x: 0, translate_y: 0, scale_x: 1, scale_y: 1, rotate_deg: 0 });
    expect(resolveMascotMotionTransform({ preset: "none", speed: 5, intensity: "dynamic" }, 4)).toEqual({
      translate_x: 0,
      translate_y: 0,
      scale_x: 1,
      scale_y: 1,
      rotate_deg: 0,
    });
    expect(Math.abs(resolveMascotMotionTransform({ ...motion, intensity: "dynamic" }, 0.75).translate_x)).toBeGreaterThan(
      Math.abs(first.translate_x),
    );
  });
});
