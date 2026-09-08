import { MASCOT_CANVAS_SIZES, serializeQuizPaletteCss, type SandboxPhaseTimeline } from "@studio/shared";
import { candyArcadeCss } from "../candyArcadeComposition.js";
import { candyArcadeFontReadinessScript } from "../candyArcade/candyArcadeFonts.js";
import { renderQuizSceneBackground, type renderStableQuizSceneParts } from "../scene/renderQuizSceneParts.js";
import type { buildQuizSceneParts } from "../scene/buildQuizSceneParts.js";
import type { adaptSandboxQuizScene } from "../scene/sandboxSceneAdapter.js";
import { getSandboxRehearsalClientScript } from "./sandboxRehearsalScript.js";

export function sandboxRewardFx(): string {
  return `
    <div class="reward-fx reward-big" style="opacity: 1; animation: none;">
      <i style="animation: none; opacity: 0.95;">★</i>
      <i style="animation: none; opacity: 0.95;">★</i>
      <i style="animation: none; opacity: 0.95;">★</i>
      <i style="animation: none; opacity: 0.95;">★</i>
      <i style="animation: none; opacity: 0.95;">★</i>
      <i style="animation: none; opacity: 0.95;">★</i>
      <i style="animation: none; opacity: 0.95;">★</i>
      <i style="animation: none; opacity: 0.95;">★</i>
      <i style="animation: none; opacity: 0.95;">★</i>
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
  const rewardHtml = model.state.reward === "visible" ? sandboxRewardFx() : "";
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
      --scene-duration: 10s;
      --choices-at: ${choicesAt}s;
      --reveal-at: ${revealAt}s;
      --reward-at: ${rewardAt}s;
      --timer-duration: 10s;
${serializeQuizPaletteCss(model.palette, "      ")}
      --question-size: ${parts.question.layout.fontSize}px;
      --question-leading: ${parts.question.layout.lineHeight};
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
    <section class="clip candy-scene quiz-question-clip layout-${model.layout.id} ${mascotClass} sandbox-preview-stage ${model.isFinal ? "is-final-scene" : ""}" data-reveal-at="${revealAt}">
      ${renderQuizSceneBackground(parts, "sandbox", { questionIndex: model.question.number - 1 })}

      <header class="game-header" data-layout-allow-occlusion>
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
  const timerDuration = Math.max(0.04, timeline.revealStart - timeline.thinkingStart);
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
      --scene-duration: ${timeline.totalDuration.toFixed(3)}s;
      --choices-at: ${timeline.choicesStart.toFixed(3)}s;
      --thinking-at: ${timeline.thinkingStart.toFixed(3)}s;
      --reveal-at: ${timeline.revealStart.toFixed(3)}s;
      --reward-at: ${timeline.explainStart.toFixed(3)}s;
      --choices-duration: ${(timeline.revealStart - timeline.choicesStart).toFixed(3)}s;
      --timer-duration: ${timerDuration.toFixed(3)}s;
      --reveal-duration: ${(timeline.explainStart - timeline.revealStart).toFixed(3)}s;
      --ambient-phase: 0s;
${serializeQuizPaletteCss(model.palette, "      ")}
      --question-size: ${parts.question.layout.fontSize}px;
      --question-leading: ${parts.question.layout.lineHeight};
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
    <section class="clip candy-scene quiz-question-clip layout-${model.layout.id} ${mascotClass} sandbox-preview-stage ${model.isFinal ? "is-final-scene" : ""}" data-reveal-at="${timeline.revealStart.toFixed(3)}">
      ${renderQuizSceneBackground(parts, "production", { questionIndex: model.question.number - 1, clipStart: 0, duration: timeline.totalDuration })}

      <header class="game-header" data-layout-allow-occlusion>
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
