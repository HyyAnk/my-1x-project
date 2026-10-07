import { describe, expect, it } from "vitest";
import type { ChannelMascotConfig, MascotProfile } from "@studio/shared";
import {
  renderProductionMascotHtmlLayer,
  renderProductionMascotAtTime,
} from "../src/quiz/render/productionMascotRenderer.js";
import { productionMascotCss } from "../src/quiz/render/candyArcade/productionMascotStyles.js";

/**
 * Fixture replicating channel Novy's dragon mascot in static media mode.
 */
const novyMascotFixture: MascotProfile = {
  id: "mascot_22cb190ece7b4475",
  name: "Novy Dragon",
  description: "Friendly baby orange dragon mascot",
  visual_style: "pixar_3d",
  master_prompt: "Cute baby dragon, vibrant scales, 3D Pixar render",
  master_image_url: "/assets/novy-master.png",
  color_theme: "#f97316",
  actions: {},
  styles: [
    {
      id: "style_pastel_dream",
      name: "Pastel Dream Style",
      keyword: "pastel_dream",
      anchor_image_url: "/assets/novy-master.png",
      is_default: true,
      created_at: "2026-08-29T00:00:00.000Z",
      updated_at: "2026-08-29T00:00:00.000Z",
      states: {
        thinking: [
          {
            id: "novy-dragon-thinking-slot-1",
            slot_index: 1,
            image_url: "/assets/novy-dragon-thinking.png",
            status: "ready",
          },
        ],
        celebrate: [
          {
            id: "novy-dragon-celebrate-slot-2",
            slot_index: 2,
            image_url: "/assets/novy-dragon-celebrate.png",
            status: "ready",
          },
        ],
      },
    },
  ],
  assigned_channel_ids: ["novy"],
  created_at: "2026-08-29T00:00:00.000Z",
  updated_at: "2026-08-29T00:00:00.000Z",
};

/**
 * Channel configuration explicitly setting mascot_media_mode to "static".
 */
const novyChannelConfig: ChannelMascotConfig = {
  enabled: true,
  position: "bottom_right",
  scale: 1.84,
  offset_x: 21,
  offset_y: 90,
  flip_x: false,
  show_in_intro: true,
  show_in_outro: true,
  show_in_question: true,
  mascot_media_mode: "static",
};

describe("Stage 4: Static Mascot Zero-Flicker Automated Validation Suite", () => {
  const q2Events = [
    { type: "choices.enter", at_seconds: 0.48, payload: {} },
    { type: "countdown.start", at_seconds: 9.4, payload: {} },
    { type: "mascot.state", at_seconds: 10.9, payload: { state: "thinking" } },
    { type: "answer.reveal", at_seconds: 15.45, payload: {} },
    { type: "mascot.state", at_seconds: 16.03, payload: { state: "celebrate" } },
    { type: "fact.enter", at_seconds: 18.14, payload: {} },
  ];

  describe("1. CSS Rendering Engine Invariance & Opacity Protections", () => {
    it("guarantees step-end discrete timing function for static state windows", () => {
      const css = productionMascotCss();

      // Rule must target data-mascot-media-mode="static"
      expect(css).toContain('.mascot-v2-state[data-mascot-media-mode="static"]');

      // Rule must use step-end timing to prevent linear opacity interpolation
      expect(css).toContain(
        "animation: mascot-v2-static-state-window var(--mascot-state-span, .04s) step-end var(--mascot-state-delay, 0s) 1 forwards;",
      );

      // Keyframes must step from opacity: 1 to opacity: 0
      expect(css).toContain("@keyframes mascot-v2-static-state-window {");
      expect(css).toContain("0% { opacity: 1; }");
      expect(css).toContain("100% { opacity: 0; }");
    });

    it("suppresses blinding bloom flash on static mascots while keeping celebratory rings and sparkles", () => {
      const css = productionMascotCss();

      // Bloom flash overlay must be suppressed
      expect(css).toContain(
        '.candy-mascot-container.mascot-v2-container .mascot-v2-state[data-mascot-media-mode="static"] .mascot-fx-bloom {\n  display: none !important;\n}',
      );

      // Shockwave rings and sparkle burst keyframes remain intact for tasteful celebration
      expect(css).toContain("@keyframes mascot-fx-ring-burst");
      expect(css).toContain("@keyframes mascot-fx-sparkle-pop");
    });

    it("locks stage entrance animations to eliminate scale popping and fade blackout dips", () => {
      const css = productionMascotCss();

      // Stage entrance animations must be suppressed for static mascots
      expect(css).toContain(".candy-mascot-container.mascot-v2-container.mascot-stage .mascot-v2-state[data-mascot-media-mode=\"static\"] .mascot-v2-enter");
      expect(css).toContain("animation: none !important;");
      expect(css).toContain("transform: none !important;");
      expect(css).toContain("opacity: 1 !important;");

      // Residual motion drift must be eliminated
      expect(css).toContain(
        '.candy-mascot-container.mascot-v2-container .mascot-v2-state[data-mascot-media-mode="static"] .mascot-v2-motion {\n  animation: none !important;\n  transform: none !important;\n}',
      );
    });
  });

  describe("2. Seam Frame-by-Frame Continuity Validation (0:40, 0:49, 1:12)", () => {
    it("maintains continuous thinking artwork across 0:40 boundary (0.00s to 0.48s)", () => {
      const sampleTimestamps = [0.0, 0.1, 0.2, 0.366, 0.367, 0.368, 0.4, 0.48];

      for (const t of sampleTimestamps) {
        const frameHtml = renderProductionMascotAtTime(
          novyMascotFixture,
          novyChannelConfig,
          {
            phase: "question",
            clipStartSeconds: 0,
            clipDurationSeconds: 23.32,
            timelineEvents: q2Events,
            mediaMode: "static",
          },
          t,
        );

        // Frame must render solid thinking pose
        expect(frameHtml).toContain('data-mascot-visible="true"');
        expect(frameHtml).toContain('data-mascot-action="thinking"');
        expect(frameHtml).toContain('data-mascot-media-mode="static"');
        expect(frameHtml).toContain("/assets/novy-dragon-thinking.png");

        // Must never include blinding bloom flash
        expect(frameHtml).not.toContain("mascot-fx-bloom-flash");
      }
    });

    it("executes clean pose switch at 0:49 reveal boundary (15.45s) without blank frames", () => {
      // 1 frame before reveal (15.433s @ 30fps)
      const beforeRevealHtml = renderProductionMascotAtTime(
        novyMascotFixture,
        novyChannelConfig,
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: 23.32,
          timelineEvents: q2Events,
          mediaMode: "static",
        },
        15.433,
      );
      expect(beforeRevealHtml).toContain('data-mascot-action="thinking"');
      expect(beforeRevealHtml).toContain("/assets/novy-dragon-thinking.png");

      // Exact reveal timestamp (15.45s)
      const atRevealHtml = renderProductionMascotAtTime(
        novyMascotFixture,
        novyChannelConfig,
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: 23.32,
          timelineEvents: q2Events,
          mediaMode: "static",
        },
        15.45,
      );
      expect(atRevealHtml).toContain('data-mascot-action="celebrate"');
      expect(atRevealHtml).toContain("/assets/novy-dragon-celebrate.png");

      // 1 frame after reveal (15.467s @ 30fps)
      const afterRevealHtml = renderProductionMascotAtTime(
        novyMascotFixture,
        novyChannelConfig,
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: 23.32,
          timelineEvents: q2Events,
          mediaMode: "static",
        },
        15.467,
      );
      expect(afterRevealHtml).toContain('data-mascot-action="celebrate"');
      expect(afterRevealHtml).toContain("/assets/novy-dragon-celebrate.png");

      // Sub-marker at 16.03s continues seamlessly with celebrate
      const subMarkerHtml = renderProductionMascotAtTime(
        novyMascotFixture,
        novyChannelConfig,
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: 23.32,
          timelineEvents: q2Events,
          mediaMode: "static",
        },
        16.03,
      );
      expect(subMarkerHtml).toContain('data-mascot-action="celebrate"');
      expect(subMarkerHtml).toContain("/assets/novy-dragon-celebrate.png");
    });

    it("maintains continuous celebrate artwork across 1:12 explanation boundary (18.14s)", () => {
      const sampleTimestamps = [18.0, 18.133, 18.14, 18.147, 18.2, 20.0, 23.32];

      for (const t of sampleTimestamps) {
        const frameHtml = renderProductionMascotAtTime(
          novyMascotFixture,
          novyChannelConfig,
          {
            phase: "question",
            clipStartSeconds: 0,
            clipDurationSeconds: 23.32,
            timelineEvents: q2Events,
            mediaMode: "static",
          },
          t,
        );

        // Frame must render continuous celebrate pose
        expect(frameHtml).toContain('data-mascot-visible="true"');
        expect(frameHtml).toContain('data-mascot-action="celebrate"');
        expect(frameHtml).toContain('data-mascot-media-mode="static"');
        expect(frameHtml).toContain("/assets/novy-dragon-celebrate.png");
      }
    });
  });

  describe("3. Production HTML Layer Architecture for Static Mascots", () => {
    it("renders valid production HTML layer with explicit static media mode attributes", () => {
      const html = renderProductionMascotHtmlLayer(novyMascotFixture, novyChannelConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 23.32,
        timelineEvents: q2Events,
      });

      // Stage container must use mascot-stage class so stage CSS rules activate
      expect(html).toContain("candy-mascot-container");
      expect(html).toContain("mascot-v2-container");
      expect(html).toContain("mascot-stage");

      // Static media mode contract attribute must be present
      expect(html).toContain('data-mascot-media-mode="static"');

      // Artwork assets must be correctly mapped to Novy dragon images
      expect(html).toContain("/assets/novy-dragon-thinking.png");
      expect(html).toContain("/assets/novy-dragon-celebrate.png");
    });
  });
});
