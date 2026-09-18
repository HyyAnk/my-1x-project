import { describe, expect, it } from "vitest";
import {
  computeSandboxPhaseTimeline,
  SETTLED_SANDBOX_PHASE_TIMESTAMPS,
  type ChannelMascotConfig,
  type MascotProfile,
} from "@studio/shared";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { renderProductionMascotHtmlLayer } from "../src/quiz/render/productionMascotRenderer.js";
import { resolveProductionMascotMarkers } from "../src/quiz/render/productionMascotTimeline.js";
import { productionMascotCss } from "../src/quiz/render/candyArcade/productionMascotStyles.js";
import { getSandboxRehearsalClientScript } from "../src/quiz/render/sandbox/sandboxRehearsalScript.js";

const fullMascotFixture: MascotProfile = {
  id: "mascot-stage-6-hero",
  name: "Stage 6 Hero Mascot",
  description: "Comprehensive mascot fixture with all canonical actions",
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
      motion_preset: "breathe",
      motion_speed: 1.0,
      motion_intensity: "normal",
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
      motion_preset: "sway",
      motion_speed: 1.25,
      motion_intensity: "normal",
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
      motion_preset: "jump",
      motion_speed: 1.1,
      motion_intensity: "dynamic",
    },
    point: {
      action: "point",
      sprite_url: "/assets/mascots/hero/point.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: -6,
      offset_y: 2,
      motion_preset: "point",
      motion_speed: 0.9,
      motion_intensity: "normal",
    },
    oops: {
      action: "oops",
      sprite_url: "/assets/mascots/hero/oops.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 0,
      offset_y: 0,
      motion_preset: "shake",
      motion_speed: 1.0,
      motion_intensity: "normal",
    },
    wave: {
      action: "wave",
      sprite_url: "/assets/mascots/hero/wave.png",
      frames_count: 1,
      fps: 8,
      loop: true,
      frame_width: 512,
      frame_height: 512,
      offset_x: 4,
      offset_y: -2,
      motion_preset: "wave",
      motion_speed: 1.0,
      motion_intensity: "normal",
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

describe("Stage 6: Mascot Motion & Multi-Phase Timeline Event Synchronization", () => {
  const timeline = computeSandboxPhaseTimeline();
  const explainStart = Number((timeline.revealStart + 0.8).toFixed(3));

  describe("1. Timeline Markers & State Windows Calibration", () => {
    it("verifies canonical phase boundary durations in the rehearsal timeline", () => {
      // Boundaries:
      // question: 0.00s to 0.85s (duration 0.85s)
      // choices: 0.85s to 2.47s (duration 1.62s)
      // thinking: 2.47s to 7.47s (duration 5.00s)
      // reveal: 7.47s to 8.27s (duration 0.80s)
      // explain: 8.27s to totalDuration
      expect(timeline.questionStart).toBe(0);
      expect(timeline.choicesStart).toBe(0.85);
      expect(timeline.thinkingStart).toBe(2.47);
      expect(timeline.revealStart).toBe(7.47);
      expect(timeline.explainStart).toBe(8.27);
      expect(timeline.totalDuration).toBeGreaterThan(8.27);

      const markers = resolveProductionMascotMarkers(
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: timeline.totalDuration,
          timelineEvents: [
            { type: "choices.enter", at_seconds: timeline.choicesStart },
            { type: "countdown.start", at_seconds: timeline.thinkingStart },
            { type: "answer.reveal", at_seconds: timeline.revealStart },
            { type: "fact.enter", at_seconds: explainStart },
          ],
        },
        0,
        timeline.totalDuration,
      );

      expect(markers).toHaveLength(5);
      expect(markers[0]).toMatchObject({ atSeconds: 0, phase: "question" });
      expect(markers[1]).toMatchObject({ atSeconds: 0.85, phase: "choices" });
      expect(markers[2]).toMatchObject({ atSeconds: 2.47, phase: "thinking" });
      expect(markers[3]).toMatchObject({ atSeconds: 7.47, phase: "reveal" });
      expect(markers[4]).toMatchObject({ atSeconds: 8.27, phase: "explain" });
    });

    it("verifies state windows in rehearsal composition match exact delays and spans", () => {
      const res = buildSandboxComposition(
        {
          mode: "rehearsal",
          aspect_ratio: "16:9",
          mascot_id: fullMascotFixture.id,
          mascot_enabled: true,
          choices: ["Alpha", "Beta", "Gamma"],
          correct_choice_index: 0,
          fact_card_text: "Earth orbits the Sun once every 365.25 days.",
        },
        fullMascotFixture,
      );

      // Verify each state layer has exact delays matching phase transitions
      expect(res.html).toContain("--mascot-state-delay:0s;--mascot-state-span:0.85s");
      expect(res.html).toContain("--mascot-state-delay:0.85s;--mascot-state-span:1.62s");
      expect(res.html).toContain("--mascot-state-delay:2.47s;--mascot-state-span:5s");
      expect(res.html).toContain("--mascot-state-delay:7.47s;--mascot-state-span:0.8s");
      expect(res.html).toContain(`--mascot-state-delay:8.27s`);
    });

    it("verifies state window coverage across all 5 settled phase timestamps with zero ghosting", () => {
      // Settled timestamps:
      // question: 0.6s
      // choices: 2.0s
      // thinking: 3.5s
      // reveal: 8.1s
      // explain: 8.8s
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.question).toBe(0.6);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices).toBe(2.0);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking).toBe(3.5);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal).toBe(8.1);
      expect(SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain).toBe(8.8);

      type StateWindow = { phase: string; delay: number; span: number };
      const stateWindows: StateWindow[] = [
        { phase: "question", delay: 0, span: 0.85 },
        { phase: "choices", delay: 0.85, span: 1.62 },
        { phase: "thinking", delay: 2.47, span: 5.0 },
        { phase: "reveal", delay: 7.47, span: 0.8 },
        { phase: "explain", delay: 8.27, span: timeline.totalDuration - 8.27 },
      ];

      // Pure mathematical simulation of the CSS keyframe state window:
      // 0% to 99.9%: opacity: 1
      // 100%: opacity: 0 (held by forwards fill-mode)
      // Before delay: opacity: 0 (initial un-animated element opacity)
      const calculateOpacityAtTime = (time: number, window: StateWindow): number => {
        if (time < window.delay) return 0;
        if (time >= window.delay + window.span) return 0;
        return 1;
      };

      const settledTimes = [
        { phase: "question", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.question },
        { phase: "choices", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.choices },
        { phase: "thinking", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.thinking },
        { phase: "reveal", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.reveal },
        { phase: "explain", time: SETTLED_SANDBOX_PHASE_TIMESTAMPS.explain },
      ];

      for (const { phase: expectedActivePhase, time } of settledTimes) {
        const opacities = stateWindows.map((win) => ({
          phase: win.phase,
          opacity: calculateOpacityAtTime(time, win),
        }));

        const activeStates = opacities.filter((item) => item.opacity === 1);
        const inactiveStates = opacities.filter((item) => item.opacity === 0);

        // Exactly one active state
        expect(activeStates).toHaveLength(1);
        expect(activeStates[0].phase).toBe(expectedActivePhase);

        // Exactly 4 inactive states (no ghosting)
        expect(inactiveStates).toHaveLength(4);
      }
    });

    it("verifies state window CSS keyframe rules hold opacity: 1 and hold opacity: 0 with forwards fill-mode", () => {
      const css = productionMascotCss();

      expect(css).toContain(
        "animation: mascot-v2-state-window var(--mascot-state-span, .04s) linear var(--mascot-state-delay, 0s) 1 forwards;",
      );
      expect(css).toContain("@keyframes mascot-v2-state-window {");
      expect(css).toContain("0%, 99.9% { opacity: 1; }");
      expect(css).toContain("100% { opacity: 0; }");
    });
  });

  describe("2. Poses & Outcome Actions Synchronization", () => {
    it("resolves idle pose for question phase when mascot has dedicated idle action", () => {
      const html = renderProductionMascotHtmlLayer(fullMascotFixture, defaultChannelConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: explainStart },
        ],
      });

      // Initial state at 0s should resolve to idle pose
      expect(html).toContain('class="mascot-v2-state state-idle"');
      expect(html).toContain('data-mascot-action="idle"');
      expect(html).toContain('data-mascot-motion-preset="breathe"');
      expect(html).toContain("/assets/mascots/hero/idle.png");
    });

    it("falls back to thinking pose for question phase when mascot lacks dedicated idle action", () => {
      const mascotWithoutIdle: MascotProfile = {
        ...fullMascotFixture,
        actions: {
          thinking: fullMascotFixture.actions.thinking,
          celebrate: fullMascotFixture.actions.celebrate,
          point: fullMascotFixture.actions.point,
        },
      };

      const html = renderProductionMascotHtmlLayer(mascotWithoutIdle, defaultChannelConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: explainStart },
        ],
      });

      // Without dedicated idle, question phase safely resolves to thinking
      expect(html).toContain('class="mascot-v2-state state-thinking"');
      expect(html).toContain('data-mascot-action="thinking"');
      expect(html).toContain('data-mascot-motion-preset="sway"');
      expect(html).toContain("/assets/mascots/hero/thinking.png");
    });

    it("resolves choices pose and thinking pose with swaying motion", () => {
      const html = renderProductionMascotHtmlLayer(fullMascotFixture, defaultChannelConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: explainStart },
        ],
      });

      // Choices state layer at 0.85s
      expect(html).toContain('data-mascot-phase="choices"');
      expect(html).toContain("--mascot-state-delay:0.85s");

      // Thinking state layer at 2.47s
      expect(html).toContain('data-mascot-phase="thinking"');
      expect(html).toContain("--mascot-state-delay:2.47s");
      expect(html).toContain('data-mascot-motion-preset="sway"');
    });

    it("resolves celebrate for correct reveal and oops for wrong reveal outcome", () => {
      const correctHtml = renderProductionMascotHtmlLayer(fullMascotFixture, defaultChannelConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        revealOutcome: "correct",
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: explainStart },
        ],
      });

      expect(correctHtml).toContain('data-mascot-phase="reveal"');
      expect(correctHtml).toContain('data-mascot-action="celebrate"');
      expect(correctHtml).toContain('class="mascot-v2-state state-celebrate"');
      expect(correctHtml).toContain('data-mascot-motion-preset="jump"');
      expect(correctHtml).toContain("/assets/mascots/hero/celebrate.png");

      const wrongHtml = renderProductionMascotHtmlLayer(fullMascotFixture, defaultChannelConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        revealOutcome: "wrong",
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: explainStart },
        ],
      });

      expect(wrongHtml).toContain('data-mascot-phase="reveal"');
      expect(wrongHtml).toContain('data-mascot-action="oops"');
      expect(wrongHtml).toContain('class="mascot-v2-state state-oops"');
      expect(wrongHtml).toContain('data-mascot-motion-preset="shake"');
      expect(wrongHtml).toContain("/assets/mascots/hero/oops.png");
    });

    it("resolves point pose for explain phase and protects against compiler celebrate default", () => {
      const html = renderProductionMascotHtmlLayer(fullMascotFixture, defaultChannelConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: explainStart },
          // Compiler placeholder with celebrate should not override explain point pose
          { type: "mascot.state", at_seconds: explainStart, payload: { state: "celebrate", phase: "explanation_start" } },
        ],
      });

      expect(html).toContain('data-mascot-phase="explain"');
      expect(html).toContain('data-mascot-action="point"');
      expect(html).toContain('class="mascot-v2-state state-point"');
      expect(html).toContain(`--mascot-state-delay:${explainStart}s`);
      expect(html).toContain("/assets/mascots/hero/point.png");
    });

    it("honors custom mascot_action overrides from the Sandbox Mascot Inspector", () => {
      // 1. Initial pose override (e.g. wave at 0s)
      const waveRehearsal = buildSandboxComposition(
        {
          mode: "rehearsal",
          aspect_ratio: "16:9",
          mascot_id: fullMascotFixture.id,
          mascot_enabled: true,
          mascot_action: "wave",
        },
        fullMascotFixture,
      );
      expect(waveRehearsal.html).toContain('data-mascot-action="wave"');
      expect(waveRehearsal.html).toContain('class="mascot-v2-state state-wave"');
      expect(waveRehearsal.html).toContain("--mascot-state-delay:0s");

      // 2. Targeted phase override (e.g. wave in reveal phase)
      const targetedRehearsal = buildSandboxComposition(
        {
          mode: "rehearsal",
          aspect_ratio: "16:9",
          mascot_id: fullMascotFixture.id,
          mascot_enabled: true,
          mascot_action: "wave",
          mascot_phase: "reveal",
        },
        fullMascotFixture,
      );
      expect(targetedRehearsal.html).toContain(`--mascot-state-delay:${timeline.revealStart}s`);
      expect(targetedRehearsal.html).toContain('data-mascot-action="wave"');
    });
  });

  describe("3. Motion & Animation Pacing during WAAPI Seeking", () => {
    it("generates stable mascot-v2-motion CSS rules with both fill-mode and sampling keyframes", () => {
      const css = productionMascotCss();

      expect(css).toContain(".candy-mascot-container.mascot-v2-container .mascot-v2-motion {");
      expect(css).toContain("animation-name: mascot-v2-motion;");
      expect(css).toContain("animation-duration: var(--mascot-motion-cycle, 1s);");
      expect(css).toContain("animation-delay: var(--mascot-motion-delay, 0s);");
      expect(css).toContain("animation-iteration-count: var(--mascot-motion-iterations, 1);");
      expect(css).toContain("animation-timing-function: linear;");
      expect(css).toContain("animation-fill-mode: both;");

      expect(css).toContain("@keyframes mascot-v2-motion {");
      expect(css).toContain("0% { transform: var(--mascot-motion-kf-0); }");
      expect(css).toContain("25% { transform: var(--mascot-motion-kf-25); }");
      expect(css).toContain("50% { transform: var(--mascot-motion-kf-50); }");
      expect(css).toContain("75% { transform: var(--mascot-motion-kf-75); }");
      expect(css).toContain("100% { transform: var(--mascot-motion-kf-100); }");
    });

    it("publishes all single-frame sprite keyframes directly in productionMascotStyles", () => {
      const css = productionMascotCss();

      expect(css).toContain("@keyframes mascot-single-breathe {");
      expect(css).toContain("@keyframes mascot-single-sway {");
      expect(css).toContain("@keyframes mascot-single-jump {");
      expect(css).toContain("@keyframes mascot-single-shake {");
      expect(css).toContain("@keyframes mascot-single-pulse {");
      expect(css).toContain("@keyframes mascot-single-wave {");
      expect(css).toContain("@keyframes mascot-single-float {");
    });

    it("verifies WAAPI seeking compatibility in sandbox rehearsal client script", () => {
      const script = getSandboxRehearsalClientScript(timeline);

      expect(script).toContain("document.getAnimations({ subtree: true })");
      expect(script).toContain("seek: function(timeSec)");
      expect(script).toContain("anim.currentTime = timeMs;");
      expect(script).toContain("anim.pause();");
      expect(script).toContain("window.__hyperframesRehearsal.seek(0);");
    });
  });

  describe("4. Responsive Placements & Flip Parity", () => {
    it("honors anchor-bottom_left and anchor-bottom_right identically in rehearsal and production", () => {
      const configLeft: ChannelMascotConfig = { ...defaultChannelConfig, position: "bottom_left" };
      const configRight: ChannelMascotConfig = { ...defaultChannelConfig, position: "bottom_right" };

      const prodLeft = renderProductionMascotHtmlLayer(fullMascotFixture, configLeft, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
      });
      const prodRight = renderProductionMascotHtmlLayer(fullMascotFixture, configRight, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
      });

      expect(prodLeft).toContain("anchor-bottom_left");
      expect(prodLeft).toContain('data-mascot-anchor="bottom_left"');
      expect(prodRight).toContain("anchor-bottom_right");
      expect(prodRight).toContain('data-mascot-anchor="bottom_right"');

      const rehearsalLeft = buildSandboxComposition(
        {
          mode: "rehearsal",
          aspect_ratio: "16:9",
          mascot_id: fullMascotFixture.id,
          mascot_position: "bottom_left",
        },
        fullMascotFixture,
      );
      const rehearsalRight = buildSandboxComposition(
        {
          mode: "rehearsal",
          aspect_ratio: "16:9",
          mascot_id: fullMascotFixture.id,
          mascot_position: "bottom_right",
        },
        fullMascotFixture,
      );

      expect(rehearsalLeft.html).toContain("anchor-bottom_left");
      expect(rehearsalLeft.html).toContain('data-mascot-anchor="bottom_left"');
      expect(rehearsalRight.html).toContain("anchor-bottom_right");
      expect(rehearsalRight.html).toContain('data-mascot-anchor="bottom_right"');
    });

    it("honors scale, offset X/Y, and flip_x across container and frame transforms", () => {
      const flippedConfig: ChannelMascotConfig = {
        ...defaultChannelConfig,
        scale: 2.15,
        offset_x: -30,
        offset_y: 45,
        flip_x: true,
      };

      const html = renderProductionMascotHtmlLayer(fullMascotFixture, flippedConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: 10,
      });

      expect(html).toContain("--mascot-scale:2.15");
      expect(html).toContain("--mascot-flip-sign:-1");
      expect(html).toContain("--mascot-placement-offset-x:-30px");
      expect(html).toContain("--mascot-placement-offset-y:45px");
      expect(html).toContain('data-mascot-scale="2.15"');
      expect(html).toContain('data-mascot-offset-x="-30"');
      expect(html).toContain('data-mascot-offset-y="45"');
      expect(html).toContain('data-mascot-flip-x="true"');

      // CSS rules must apply the flip sign and scale to the frame transform
      const css = productionMascotCss();
      expect(css).toContain("transform: translate(var(--mascot-placement-offset-x, 0px), var(--mascot-placement-offset-y, 0px));");
      expect(css).toContain("scaleX(var(--mascot-flip-sign, 1)) scale(var(--mascot-scale, 1))");
    });

    it("maintains 9:16 portrait viewport safe-zone integration and anchors", () => {
      const css = productionMascotCss();

      expect(css).toContain('#stage[data-aspect-ratio="9:16"] .quiz-question-clip .candy-mascot-container.mascot-v2-container');
      expect(css).toContain("bottom: var(--safe-zone-bottom, 440px);");
      expect(css).toContain('#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.anchor-bottom_left {');
      expect(css).toContain("left: 36px;");
      expect(css).toContain('#stage[data-aspect-ratio="9:16"] .candy-mascot-container.mascot-v2-container.anchor-bottom_right {');
      expect(css).toContain("right: var(--safe-zone-right, 140px);");
    });
  });
});
