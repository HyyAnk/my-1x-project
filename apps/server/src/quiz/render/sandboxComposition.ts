import {
  computeSandboxPhaseTimeline,
  SandboxPreviewInputSchema,
  type MascotProfile,
  type SandboxPreviewInput,
  type SandboxPreviewResponse,
} from "@studio/shared";
import { evaluateContrast } from "../visual/contrastCalculator.js";
import { candyArcadeCss } from "./candyArcadeComposition.js";
import { esc } from "./candyArcade/candyArcadeSvg.js";
import { renderQuizLayoutBody } from "./layouts/registry.js";
import { isUnifiedQuizFrame, renderQuizPhaseSlots } from "./frame/renderQuizFrameBody.js";
import { renderPreviewMascotHtmlLayer } from "./previewMascotRenderer.js";
import {
  adaptMascotForPhase,
  adaptMascotForQuestion,
  renderProductionMascotHtmlLayer,
  type ProductionMascotTimelineEvent,
} from "./productionMascotRenderer.js";
import { adaptSandboxQuizScene } from "./scene/sandboxSceneAdapter.js";
import { sandboxPreviewTimeForPhase, sandboxSceneState } from "./scene/sandboxSceneStateAdapter.js";
import { buildQuizSceneParts } from "./scene/buildQuizSceneParts.js";
import { renderQuizSceneChoicePart, renderQuizSceneThinkingPart, renderStableQuizSceneParts } from "./scene/renderQuizSceneParts.js";
import { rewardFx } from "./candyArcade/candyArcadeClips.js";
import type { QuizScenePhase } from "./scene/quizScene.types.js";
import { sandboxRehearsalDocument, sandboxRewardFx, sandboxSnapshotDocument } from "./sandbox/sandboxDocumentTemplates.js";

export { sandboxSnapshotDocument, sandboxRehearsalDocument, sandboxRewardFx };

export function buildSandboxComposition(input: SandboxPreviewInput, mascotProfile?: MascotProfile | null): SandboxPreviewResponse {
  const parsed = SandboxPreviewInputSchema.parse(input);
  if (parsed.mode === "rehearsal") {
    return buildSandboxRehearsalComposition(parsed, mascotProfile);
  }
  return buildSandboxSnapshotComposition(parsed, mascotProfile);
}

function buildSandboxRehearsalComposition(parsed: SandboxPreviewInput, mascotProfile?: MascotProfile | null): SandboxPreviewResponse {
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
  const questionIndex = Math.max(0, (parsed.question_number ?? 1) - 1);
  const adaptedMascot = adaptMascotForQuestion(mascotProfile, parsed.mascot_style_id, questionIndex);
  const actionAtSeconds =
    parsed.mascot_phase === "choices"
      ? timeline.choicesStart
      : parsed.mascot_phase === "thinking"
        ? timeline.thinkingStart
        : parsed.mascot_phase === "reveal"
          ? timeline.revealStart
          : parsed.mascot_phase === "explain"
            ? timeline.revealStart + 0.8
            : 0;

  const timelineEvents: ProductionMascotTimelineEvent[] = [
    { type: "choices.enter", at_seconds: timeline.choicesStart },
    { type: "countdown.start", at_seconds: timeline.thinkingStart },
    { type: "answer.reveal", at_seconds: timeline.revealStart },
    { type: "fact.enter", at_seconds: timeline.revealStart + 0.8 },
  ];

  if (parsed.mascot_action) {
    timelineEvents.push({
      type: "mascot.state",
      at_seconds: actionAtSeconds,
      payload: {
        state: parsed.mascot_action,
        ...(parsed.mascot_phase ? { phase: parsed.mascot_phase } : {}),
      },
    });
  }

  const mascotHtml =
    mascotEnabled && adaptedMascot
      ? renderProductionMascotHtmlLayer(adaptedMascot, mascotConfig, {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: timeline.totalDuration,
          styleId: parsed.mascot_style_id,
          timelineEvents,
          revealOutcome: parsed.mascot_reveal_outcome ?? "correct",
          aspectRatio: parsed.aspect_ratio,
        })
      : "";

  const model = adaptSandboxQuizScene(parsed, Boolean(mascotHtml));
  const parts = buildQuizSceneParts(model);
  const stableParts = renderStableQuizSceneParts(parts);
  const choicesHtml = renderQuizSceneChoicePart(parts, { revealMode: "scheduled" });
  const rewardStart = timeline.revealStart + 0.8;
  const timing = {
    start: 0,
    choicesStart: timeline.choicesStart,
    thinkingStart: timeline.thinkingStart,
    revealStart: timeline.revealStart,
    rewardStart,
    end: timeline.totalDuration,
  };
  const isUnified = isUnifiedQuizFrame(model.layout.id, model.aspectRatio);
  const thinkingHtml = renderQuizSceneThinkingPart(parts, timing);
  const factHtml = `<div class="fact-card sandbox-explain-card" data-layout-allow-occlusion><p>${esc(parsed.fact_card_text)}</p></div>`;
  const phaseHtml = isUnified ? renderQuizPhaseSlots(thinkingHtml, factHtml) : `${thinkingHtml}${factHtml}`;
  const stageContent = renderQuizLayoutBody(model.layout.id, {
    questionBoxHtml: stableParts.questionBoxHtml,
    heroHtml: stableParts.heroHtml,
    choicesHtml,
    phaseHtml,
  });
  const rewardHtml = rewardFx("big");
  const html = sandboxRehearsalDocument(model, parts, stableParts, stageContent, mascotHtml, rewardHtml, timeline);
  return {
    html,
    css: candyArcadeCss({ fontMode: "preview", aspectRatio: model.aspectRatio, backgroundStyles: [parts.background.style] }),
    contrast_report: evaluateContrast(model.palette.text, model.palette.surface, 4.5),
  };
}

function buildSandboxSnapshotComposition(parsed: SandboxPreviewInput, mascotProfile?: MascotProfile | null): SandboxPreviewResponse {
  const state = sandboxSceneState(parsed);
  const mascotHtml = renderSandboxMascot(parsed, mascotProfile, state.phase);
  const model = adaptSandboxQuizScene(parsed, Boolean(mascotHtml));
  const parts = buildQuizSceneParts(model);
  const stableParts = renderStableQuizSceneParts(parts);
  const choicesHtml = renderQuizSceneChoicePart(parts);
  const timing = { start: 0, choicesStart: 0, thinkingStart: 0, revealStart: 10, rewardStart: 10, end: 10 };
  const isUnified = isUnifiedQuizFrame(model.layout.id, model.aspectRatio);
  const thinkingHtml = parts.phase.thinkingVisible ? renderQuizSceneThinkingPart(parts, timing) : "";
  const factHtml = parts.phase.factVisible
    ? `
    <div class="fact-card sandbox-explain-card" style="opacity: 1; animation: none;${isUnified ? "" : " transform: translateX(-50%);"}">
      <p>${esc(parts.phase.factText)}</p>
    </div>
  `
    : "";
  const phaseHtml = isUnified ? renderQuizPhaseSlots(thinkingHtml, factHtml) : `${thinkingHtml}${factHtml}`;
  const stageContent = renderQuizLayoutBody(model.layout.id, {
    questionBoxHtml: stableParts.questionBoxHtml,
    heroHtml: stableParts.heroHtml,
    choicesHtml,
    phaseHtml,
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
  const questionIndex = Math.max(0, (input.question_number ?? 1) - 1);
  let adaptedMascot = adaptMascotForQuestion(mascotProfile, input.mascot_style_id, questionIndex);
  if (phase === "intro" || phase === "outro") {
    adaptedMascot = adaptMascotForPhase(adaptedMascot, phase, input.mascot_style_id);
  }
  const action = input.mascot_action || (phase === "reveal" ? "celebrate" : phase === "explain" ? "point" : "thinking");
  const timelineTime = input.mascot_timeline_time_seconds ?? input.timeline_time_seconds ?? sandboxPreviewTimeForPhase(phase);
  return renderPreviewMascotHtmlLayer(
    adaptedMascot,
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
