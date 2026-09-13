import { MASCOT_CANVAS_SIZES, serializeQuizPaletteCss, type SandboxPhaseTimeline } from "@studio/shared";
import { candyArcadeCss } from "../candyArcadeComposition.js";
import { candyArcadeFontReadinessScript } from "../candyArcade/candyArcadeFonts.js";
import { renderQuizSceneBackground, type renderStableQuizSceneParts } from "../scene/renderQuizSceneParts.js";
import type { buildQuizSceneParts } from "../scene/buildQuizSceneParts.js";
import type { adaptSandboxQuizScene } from "../scene/sandboxSceneAdapter.js";
import { getSandboxRehearsalClientScript } from "./sandboxRehearsalScript.js";
import { isUnifiedQuizFrame } from "../frame/renderQuizFrameBody.js";
import { calculateThinkingBarTiming } from "../../visual/elements/thinkingBar/types.js";

export function sandboxRewardFx(intensity: "small" | "big" = "big"): string {
  const particles = intensity === "big" ? ["★", "✦", "★", "✦", "★", "✦", "★", "✦", "★"] : ["✦", "★", "✦", "★", "✦", "★", "✦"];
  return `
    <div class="reward-fx reward-${intensity}" style="opacity: 1; animation: none;" data-layout-ignore aria-hidden="true">
      ${particles.map((particle) => `<i style="animation: none; opacity: 0.95;">${particle}</i>`).join("")}
    </div>
  `;
}

export function sandboxSnapshotDocument(
  model: ReturnType<typeof adaptSandboxQuizScene>,
  parts: ReturnType<typeof buildQuizSceneParts>,
  stableParts: ReturnType<typeof renderStableQuizSceneParts>,
  stageContent: string,
  mascotHtml: string,
): string {
  const canvas = MASCOT_CANVAS_SIZES[model.aspectRatio];
  const choicesAt = model.state.choices === "hidden" ? 999 : 0;
  const revealAt = model.state.answers === "revealed" ? 0 : 999;
  const rewardAt = model.state.fact === "visible" ? 0 : 999;
  const mascotClass = model.mascot.occupied ? "has-mascot" : "";
  const rewardHtml = model.state.reward === "visible" ? sandboxRewardFx(model.isFinal ? "big" : "big") : "";
  const isUnified = isUnifiedQuizFrame(model.layout.id, model.aspectRatio);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base href="/">
  <title>HyperFrames Sandbox Live Preview</title>
  <style>
    ${candyArcadeCss({ fontMode: "preview", aspectRatio: model.aspectRatio, backgroundStyles: [parts.background.style] })}

    /* Live Sandbox Phase Styling Overrides */
    .sandbox-preview-stage {
      --clip-start: 0s;
      --timer-start: 0s;
      --scene-duration: 10s;
      --choices-at: ${choicesAt}s;
      --reveal-at: ${revealAt}s;
      --reward-at: ${rewardAt}s;
      --timer-duration: 10s;
      --query-hold-duration: 5.000s;
${serializeQuizPaletteCss(model.palette, "      ")}
${model.aspectRatio === "9:16" ? `      --safe-zone-top: 180px;
      --safe-zone-bottom: 440px;
      --safe-zone-left: 36px;
      --safe-zone-right: 140px;` : `      --safe-zone-top: 54px;
      --safe-zone-bottom: 54px;
      --safe-zone-left: 96px;
      --safe-zone-right: 96px;`}
      --question-size: ${parts.question.layout.fontSize || 50}px;
      --question-leading: ${parts.question.layout.lineHeight || 1.18};
      position: absolute;
      inset: 0;
      width: ${canvas.width}px;
      height: ${canvas.height}px;
      overflow: hidden;
    }

    .sandbox-preview-stage .thinking-bar {
      opacity: 1;
      animation: none;
    }

  </style>
</head>
<body>
  <main id="stage" data-composition-id="quiz-v2-candy-arcade" data-no-timeline data-start="0" data-width="${canvas.width}" data-height="${canvas.height}" data-aspect-ratio="${model.aspectRatio}" data-duration="10" data-fps="30">
    <section class="clip candy-scene quiz-question-clip ${isUnified ? "quiz-frame-unified" : ""} layout-${model.layout.id} ${mascotClass} sandbox-preview-stage ${model.isFinal ? "is-final-scene" : ""}" data-reveal-at="${revealAt}">
      ${renderQuizSceneBackground(parts, "sandbox", { questionIndex: model.question.number - 1 })}

      <header class="game-header" data-quiz-fixed="counter" data-layout-allow-occlusion>
        ${stableParts.counterBadgeHtml}
      </header>

      <div class="game-stage" data-layout-allow-overflow>
        ${stageContent}
      </div>

      ${stableParts.brandMarkHtml}
      ${mascotHtml}
      ${rewardHtml}
    </section>
  </main>
  <script>${candyArcadeFontReadinessScript()}</script>
</body>
</html>`;
}

export function sandboxRehearsalDocument(
  model: ReturnType<typeof adaptSandboxQuizScene>,
  parts: ReturnType<typeof buildQuizSceneParts>,
  stableParts: ReturnType<typeof renderStableQuizSceneParts>,
  stageContent: string,
  mascotHtml: string,
  rewardHtml: string,
  timeline: SandboxPhaseTimeline,
): string {
  const canvas = MASCOT_CANVAS_SIZES[model.aspectRatio];
  const mascotClass = model.mascot.occupied ? "has-mascot" : "";
  const isUnified = isUnifiedQuizFrame(model.layout.id, model.aspectRatio);
  const thinkingTiming = calculateThinkingBarTiming({
    clipStart: 0,
    revealStart: timeline.revealStart,
    thinkingStart: timeline.thinkingStart,
  });
  const rewardStart = timeline.revealStart + 0.8;
  const revealDuration = Math.max(0.04, rewardStart - timeline.revealStart);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base href="/">
  <title>HyperFrames Sandbox Rehearsal Preview</title>
  <style>
    ${candyArcadeCss({ fontMode: "preview", aspectRatio: model.aspectRatio, backgroundStyles: [parts.background.style] })}

    /* Rehearsal Stage Dynamic Animation Pacing */
    .sandbox-preview-stage {
      --clip-start: 0s;
      --timer-start: 0s;
      --scene-duration: ${timeline.totalDuration.toFixed(3)}s;
      --choices-at: ${timeline.choicesStart.toFixed(3)}s;
      --thinking-at: ${timeline.thinkingStart.toFixed(3)}s;
      --reveal-at: ${timeline.revealStart.toFixed(3)}s;
      --reward-at: ${rewardStart.toFixed(3)}s;
      --choices-duration: ${(timeline.revealStart - timeline.choicesStart).toFixed(3)}s;
      --timer-duration: ${thinkingTiming.duration.toFixed(3)}s;
      --query-hold-duration: ${thinkingTiming.queryHoldDuration.toFixed(3)}s;
      --query-display: ${thinkingTiming.queryHoldDuration > 0 ? "grid" : "none"};
      --cd5-at: ${thinkingTiming.cd5.toFixed(3)}s;
      --cd5-display: ${thinkingTiming.cd5Show ? "grid" : "none"};
      --cd4-at: ${thinkingTiming.cd4.toFixed(3)}s;
      --cd4-display: ${thinkingTiming.cd4Show ? "grid" : "none"};
      --cd3-at: ${thinkingTiming.cd3.toFixed(3)}s;
      --cd3-display: ${thinkingTiming.cd3Show ? "grid" : "none"};
      --cd2-at: ${thinkingTiming.cd2.toFixed(3)}s;
      --cd2-display: ${thinkingTiming.cd2Show ? "grid" : "none"};
      --cd1-at: ${thinkingTiming.cd1.toFixed(3)}s;
      --cd1-display: ${thinkingTiming.cd1Show ? "grid" : "none"};
      --reveal-duration: ${revealDuration.toFixed(3)}s;
      --ambient-phase: 0s;
${serializeQuizPaletteCss(model.palette, "      ")}
${model.aspectRatio === "9:16" ? `      --safe-zone-top: 180px;
      --safe-zone-bottom: 440px;
      --safe-zone-left: 36px;
      --safe-zone-right: 140px;` : `      --safe-zone-top: 54px;
      --safe-zone-bottom: 54px;
      --safe-zone-left: 96px;
      --safe-zone-right: 96px;`}
      --question-size: ${parts.question.layout.fontSize || 50}px;
      --question-leading: ${parts.question.layout.lineHeight || 1.18};
      position: absolute;
      inset: 0;
      width: ${canvas.width}px;
      height: ${canvas.height}px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <main id="stage" data-composition-id="quiz-v2-candy-arcade" data-no-timeline data-start="0" data-width="${canvas.width}" data-height="${canvas.height}" data-aspect-ratio="${model.aspectRatio}" data-duration="${timeline.totalDuration.toFixed(3)}" data-fps="30">
    <section class="clip candy-scene quiz-question-clip ${isUnified ? "quiz-frame-unified" : ""} layout-${model.layout.id} ${mascotClass} sandbox-preview-stage ${model.isFinal ? "is-final-scene" : ""}" data-reveal-at="${timeline.revealStart.toFixed(3)}">
      ${renderQuizSceneBackground(parts, "production", { questionIndex: model.question.number - 1, clipStart: 0, duration: timeline.totalDuration })}

      <header class="game-header" data-quiz-fixed="counter" data-layout-allow-occlusion>
        ${stableParts.counterBadgeHtml}
      </header>

      <div class="game-stage" data-layout-allow-overflow>
        ${stageContent}
      </div>

      ${stableParts.brandMarkHtml}
      ${mascotHtml}
      ${rewardHtml}
    </section>
  </main>
  <script>
    ${candyArcadeFontReadinessScript()}
    ${getSandboxRehearsalClientScript(timeline)}
  </script>
</body>
</html>`;
}
