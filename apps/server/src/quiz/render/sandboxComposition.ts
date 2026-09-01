import {
  computeSandboxPhaseTimeline,
  MASCOT_CANVAS_SIZES,
  SandboxPreviewInputSchema,
  serializeQuizPaletteCss,
  type MascotProfile,
  type SandboxPhaseTimeline,
  type SandboxPreviewInput,
  type SandboxPreviewResponse,
} from "@studio/shared";
import { evaluateContrast } from "../visual/contrastCalculator.js";
import { candyArcadeCss } from "./candyArcadeComposition.js";
import { candyArcadeFontReadinessScript } from "./candyArcade/candyArcadeFonts.js";
import { esc } from "./candyArcade/candyArcadeSvg.js";
import { renderQuizLayoutBody } from "./layouts/registry.js";
import { renderPreviewMascotHtmlLayer } from "./previewMascotRenderer.js";
import { renderProductionMascotHtmlLayer } from "./productionMascotRenderer.js";
import { adaptSandboxQuizScene } from "./scene/sandboxSceneAdapter.js";
import { sandboxPreviewTimeForPhase, sandboxSceneState } from "./scene/sandboxSceneStateAdapter.js";
import { buildQuizSceneParts } from "./scene/buildQuizSceneParts.js";
import {
  renderQuizSceneBackground,
  renderQuizSceneChoicePart,
  renderQuizSceneThinkingPart,
  renderStableQuizSceneParts,
} from "./scene/renderQuizSceneParts.js";
import { rewardFx } from "./candyArcade/candyArcadeClips.js";
import type { QuizScenePhase } from "./scene/quizScene.types.js";

export function buildSandboxComposition(input: SandboxPreviewInput, mascotProfile?: MascotProfile | null): SandboxPreviewResponse {
  const parsed = SandboxPreviewInputSchema.parse(input);
  if (parsed.mode === "rehearsal") {
    return buildSandboxRehearsalComposition(parsed, mascotProfile);
  }
  return buildSandboxSnapshotComposition(parsed, mascotProfile);
}

function buildSandboxRehearsalComposition(
  parsed: SandboxPreviewInput,
  mascotProfile?: MascotProfile | null,
): SandboxPreviewResponse {
  const timeline = computeSandboxPhaseTimeline();
  const mascotEnabled = parsed.mascot_enabled !== false && parsed.mascot_id !== "none";
  const mascotConfig = {
    enabled: mascotEnabled,
    position: parsed.mascot_position,
    scale: parsed.mascot_scale,
    offset_x: parsed.mascot_offset_x || 0,
    offset_y: parsed.mascot_offset_y || 0,
    flip_x: parsed.mascot_flip_x,
    show_in_intro: parsed.mascot_show_in_intro,
    show_in_outro: parsed.mascot_show_in_outro,
    show_in_question: parsed.mascot_show_in_question,
  };
  const mascotHtml = mascotEnabled && mascotProfile
    ? renderProductionMascotHtmlLayer(mascotProfile, mascotConfig, {
        phase: "question",
        clipStartSeconds: 0,
        clipDurationSeconds: timeline.totalDuration,
        timelineEvents: [
          { type: "choices.enter", at_seconds: timeline.choicesStart },
          { type: "countdown.start", at_seconds: timeline.thinkingStart },
          { type: "answer.reveal", at_seconds: timeline.revealStart },
          { type: "fact.enter", at_seconds: timeline.explainStart },
        ],
        revealOutcome: parsed.mascot_reveal_outcome ?? "correct",
        aspectRatio: parsed.aspect_ratio,
      })
    : "";

  const model = adaptSandboxQuizScene(parsed, Boolean(mascotHtml));
  const parts = buildQuizSceneParts(model);
  const stableParts = renderStableQuizSceneParts(parts);
  const choicesHtml = renderQuizSceneChoicePart(parts);
  const timing = {
    start: 0,
    choicesStart: timeline.choicesStart,
    thinkingStart: timeline.thinkingStart,
    revealStart: timeline.revealStart,
    rewardStart: timeline.explainStart,
    end: timeline.totalDuration,
  };
  const thinkingHtml = renderQuizSceneThinkingPart(parts, timing);
  const factHtml = `<div class="fact-card sandbox-explain-card" data-layout-allow-occlusion><p>${esc(parsed.fact_card_text)}</p></div>`;
  const stageContent = renderQuizLayoutBody(model.layout.id, {
    questionBoxHtml: stableParts.questionBoxHtml,
    heroHtml: stableParts.heroHtml,
    choicesHtml,
    phaseHtml: `${thinkingHtml}${factHtml}`,
  });
  const rewardHtml = rewardFx("big");
  const html = sandboxRehearsalDocument(model, parts, stableParts, stageContent, mascotHtml, rewardHtml, timeline);
  return {
    html,
    css: candyArcadeCss({ fontMode: "preview", aspectRatio: model.aspectRatio, backgroundStyles: [parts.background.style] }),
    contrast_report: evaluateContrast(model.palette.text, model.palette.surface, 4.5),
  };
}

function buildSandboxSnapshotComposition(
  parsed: SandboxPreviewInput,
  mascotProfile?: MascotProfile | null,
): SandboxPreviewResponse {
  const state = sandboxSceneState(parsed);
  const mascotHtml = renderSandboxMascot(parsed, mascotProfile, state.phase);
  const model = adaptSandboxQuizScene(parsed, Boolean(mascotHtml));
  const parts = buildQuizSceneParts(model);
  const stableParts = renderStableQuizSceneParts(parts);
  const choicesHtml = renderQuizSceneChoicePart(parts);
  const timing = { start: 0, choicesStart: 0, thinkingStart: 0, revealStart: 10, rewardStart: 10, end: 10 };
  const thinkingHtml = parts.phase.thinkingVisible ? renderQuizSceneThinkingPart(parts, timing) : "";
  const factHtml = parts.phase.factVisible
    ? `
    <div class="fact-card sandbox-explain-card" style="opacity: 1; animation: none; transform: translateX(-50%);">
      <p>${esc(parts.phase.factText)}</p>
    </div>
  `
    : "";
  const stageContent = renderQuizLayoutBody(model.layout.id, {
    questionBoxHtml: stableParts.questionBoxHtml,
    heroHtml: stableParts.heroHtml,
    choicesHtml,
    phaseHtml: `${thinkingHtml}${factHtml}`,
  });
  const html = sandboxSnapshotDocument(model, parts, stableParts, stageContent, mascotHtml);
  return {
    html,
    css: candyArcadeCss({ fontMode: "preview", aspectRatio: model.aspectRatio, backgroundStyles: [parts.background.style] }),
    contrast_report: evaluateContrast(model.palette.text, model.palette.surface, 4.5),
  };
}

function renderSandboxMascot(
  input: SandboxPreviewInput,
  mascotProfile: MascotProfile | null | undefined,
  scenePhase: QuizScenePhase,
): string {
  const enabled = input.mascot_enabled !== false && input.mascot_id !== "none";
  if (!enabled || !mascotProfile) return "";
  const phase = input.mascot_phase ?? scenePhase;
  const action = input.mascot_action || (phase === "reveal" ? "celebrate" : phase === "explain" ? "point" : "thinking");
  const timelineTime = input.mascot_timeline_time_seconds ?? input.timeline_time_seconds ?? sandboxPreviewTimeForPhase(phase);
  return renderPreviewMascotHtmlLayer(
    mascotProfile,
    {
      enabled: input.mascot_enabled,
      position: input.mascot_position,
      scale: input.mascot_scale,
      offset_x: input.mascot_offset_x || 0,
      offset_y: input.mascot_offset_y || 0,
      flip_x: input.mascot_flip_x,
      show_in_intro: input.mascot_show_in_intro,
      show_in_outro: input.mascot_show_in_outro,
      show_in_question: input.mascot_show_in_question,
    },
    {
      aspectRatio: input.aspect_ratio,
      phase,
      timelineTimeSeconds: timelineTime,
      revealOutcome: phase === "reveal" ? input.mascot_reveal_outcome : null,
      actionOverride: action,
      playing: input.mascot_playing,
    },
  );
}

function sandboxSnapshotDocument(
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
    <section class="clip candy-scene quiz-question-clip layout-${model.layout.id} ${mascotClass} sandbox-preview-stage ${model.isFinal ? "is-final-scene" : ""}">
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

function sandboxRehearsalDocument(
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
    <section class="clip candy-scene quiz-question-clip layout-${model.layout.id} ${mascotClass} sandbox-preview-stage ${model.isFinal ? "is-final-scene" : ""}">
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
    window.__hyperframesRehearsal = {
      duration: ${timeline.totalDuration.toFixed(3)},
      seek: function(timeSec) {
        var timeMs = Math.max(0, timeSec * 1000);
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try { anims[i].currentTime = timeMs; } catch (e) {}
        }
      },
      play: function() {
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try { anims[i].play(); } catch (e) {}
        }
      },
      pause: function() {
        var anims = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
        for (var i = 0; i < anims.length; i++) {
          try { anims[i].pause(); } catch (e) {}
        }
      }
    };
    window.addEventListener("message", function(event) {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "REHEARSAL_SEEK") {
        window.__hyperframesRehearsal.seek(event.data.time);
      } else if (event.data.type === "REHEARSAL_PLAY") {
        window.__hyperframesRehearsal.play();
      } else if (event.data.type === "REHEARSAL_PAUSE") {
        window.__hyperframesRehearsal.pause();
      }
    });
  </script>
</body>
</html>`;
}

function sandboxRewardFx(): string {
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
