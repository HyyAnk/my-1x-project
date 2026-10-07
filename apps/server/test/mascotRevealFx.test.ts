import { describe, expect, it } from "vitest";
import type { ChannelMascotConfig, MascotProfile } from "@studio/shared";
import { renderProductionMascotHtmlLayer } from "../src/quiz/render/productionMascotRenderer.js";
import { productionMascotCss } from "../src/quiz/render/candyArcade/productionMascotStyles.js";
import { renderMascotRevealFx } from "../src/quiz/render/mascot/mascotRevealFx.js";

const testMascotFixture: MascotProfile = {
  id: "mascot-test-hero",
  name: "Test Hero Mascot",
  description: "Test mascot with actions",
  visual_style: "pixar_3d",
  master_prompt: "cute energetic hero robot",
  master_image_url: "/assets/mascots/hero/master.png",
  color_theme: "#3b82f6",
  actions: {
    idle: {
      action: "idle",
      sprite_url: "/assets/mascots/hero/idle.png",
      frames_count: 1,
      fps: 6,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
    },
    thinking: {
      action: "thinking",
      sprite_url: "/assets/mascots/hero/thinking.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 10,
      offset_y: -4,
    },
    celebrate: {
      action: "celebrate",
      sprite_url: "/assets/mascots/hero/celebrate.png",
      frames_count: 1,
      fps: 10,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: -12,
    },
  },
  assigned_channel_ids: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

const defaultChannelConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_right",
  scale: 1.84,
  offset_x: 24,
  offset_y: 88,
  flip_x: false,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
};

describe("Mascot Reveal VFX Transition (Option A)", () => {
  it("renders pure reveal FX markup with correct timing delay variable", () => {
    const fxHtml = renderMascotRevealFx({ stateDelay: 4.85, preview: false });

    expect(fxHtml).toContain('class="mascot-reveal-fx"');
    expect(fxHtml).toContain("--mascot-fx-delay:4.85s");
    expect(fxHtml).toContain('class="mascot-fx-bloom"');
    expect(fxHtml).toContain('class="mascot-fx-ring ring-1"');
    expect(fxHtml).toContain('class="mascot-fx-ring ring-2"');
    expect(fxHtml).toContain('class="mascot-fx-sparkle sp-1"');
    expect(fxHtml).toContain('class="mascot-fx-sparkle sp-2"');
    expect(fxHtml).toContain('class="mascot-fx-sparkle sp-3"');
    expect(fxHtml).toContain('class="mascot-fx-sparkle sp-4"');
  });

  it("suppresses reveal FX markup when preview mode is active", () => {
    const fxHtml = renderMascotRevealFx({ stateDelay: 4.85, preview: true });
    expect(fxHtml).toBe("");
  });

  it("injects reveal FX and enter-pop wrapper into the reveal phase in production render", () => {
    const html = renderProductionMascotHtmlLayer(testMascotFixture, defaultChannelConfig, {
      phase: "question",
      clipStartSeconds: 0,
      clipDurationSeconds: 10,
      timelineEvents: [
        { type: "choices.enter", at_seconds: 1.0 },
        { type: "countdown.start", at_seconds: 2.0 },
        { type: "answer.reveal", at_seconds: 5.0 },
        { type: "fact.enter", at_seconds: 7.0 },
      ],
    });

    // Reveal state layer has the reveal VFX markup
    expect(html).toContain('class="mascot-v2-state state-celebrate"');
    expect(html).toContain('class="mascot-reveal-fx"');
    expect(html).toContain("--mascot-fx-delay:5s");
    expect(html).toContain('class="mascot-fx-bloom"');
    expect(html).toContain('class="mascot-fx-ring ring-1"');
    expect(html).toContain('class="mascot-fx-ring ring-2"');

    // Reveal state layer has the enter-pop wrapper around motion
    expect(html).toContain('class="mascot-v2-enter enter-pop"');
    expect(html).toContain("--mascot-enter-delay:5s");

    // Thinking state layer does NOT have reveal FX
    const thinkingSegment = html.slice(0, html.indexOf('class="mascot-v2-state state-celebrate"'));
    expect(thinkingSegment).not.toContain("mascot-reveal-fx");
  });

  it("exports comprehensive CSS keyframes and rules for Option A VFX in productionMascotCss", () => {
    const css = productionMascotCss();

    // Verify enter wrapper and pop animation
    expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-v2-enter {");
    expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-v2-enter.enter-pop {");
    expect(css).toContain("@keyframes mascot-v2-enter-pop {");

    // Verify shockwave ring burst keyframes
    expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-fx-ring {");
    expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-fx-ring.ring-1 {");
    expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-fx-ring.ring-2 {");
    expect(css).toContain("@keyframes mascot-fx-ring-burst {");

    // Verify flash bloom keyframes
    expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-fx-bloom {");
    expect(css).toContain("@keyframes mascot-fx-bloom-flash {");

    // Verify sparkle burst keyframes
    expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-fx-sparkle {");
    expect(css).toContain("@keyframes mascot-fx-sparkle-pop {");

    // Verify preview override suppresses FX
    expect(css).toContain(".candy-mascot-container.mascot-v2-preview .mascot-reveal-fx {");
    expect(css).toContain("display: none !important;");

    // Verify reduced motion accessibility override
    expect(css).toContain("@media (prefers-reduced-motion: reduce) {");
    expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-reveal-fx");
    expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-v2-enter");

    // Verify static media mode overrides (Stage 2)
    expect(css).toContain('.mascot-v2-state[data-mascot-media-mode="static"] .mascot-fx-bloom {');
    expect(css).toContain('.mascot-stage .mascot-v2-state[data-mascot-media-mode="static"] .mascot-v2-enter');
    expect(css).toContain('.mascot-v2-state[data-mascot-media-mode="static"] .mascot-v2-motion {');
  });
});

