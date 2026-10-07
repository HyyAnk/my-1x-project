import type { ChannelMascotConfig, MascotProfile, MascotRenderAspectRatio, MascotStateMediaMode } from "@studio/shared";
import { resolveChannelMascotPlacement } from "@studio/shared";
import { motionCssClass } from "../../visual/candyArcade.js";
import { esc } from "./candyArcadeSvg.js";
import { source } from "./candyArcadeAudio.js";
import { renderProductionMascotHtmlLayer, type ProductionMascotRenderOptions } from "../productionMascotRenderer.js";
import { adaptProductionQuizScene } from "../scene/productionSceneAdapter.js";
import { buildQuizSceneParts } from "../scene/buildQuizSceneParts.js";
import {
  renderQuizSceneBackground,
  renderQuizSceneChoicePart,
  renderQuizSceneThinkingPart,
  renderStableQuizSceneParts,
} from "../scene/renderQuizSceneParts.js";
import { renderQuizLayoutBody } from "../layouts/registry.js";
import { isUnifiedQuizFrame } from "../frame/renderQuizFrameBody.js";
import { renderQuizScenePhaseParts } from "../scene/renderQuizScenePhaseParts.js";
import type { QuizSceneTiming } from "../scene/quizScene.types.js";
import type { Copy } from "./quizCopy.js";
import { rewardFx, styleAttributes } from "./candyArcadeClipElements.js";
import type { QuestionClipInput } from "./candyArcadeClipTypes.js";
import {
  assertZeroBasedTiming,
  normalizeMascotTimelineEventsToZeroBased,
  normalizeSceneTimingToZeroBased,
} from "./candyArcadeTiming.js";

export { quizCopy, type Copy } from "./quizCopy.js";
export {
  toSubComposition,
  requiredAttribute,
  rootRelativeSubCompositionAssets,
  subCompositionMount,
  sanitizeSubCompositionRootStyle,
  type SubComposition,
} from "./subCompositionParser.js";
export { rewardFx, imageCard, revealPanel, sceneDecorations, styleAttributes } from "./candyArcadeClipElements.js";
export { transitionClip, type TransitionClipInput } from "./transitionClip.js";
export {
  customIntroVideoClip,
  customOutroVideoClip,
  calculateIntroTransitionTiming,
  renderIntroTransitionOverlay,
  resolveTransitionDefinition,
} from "./customVideoClips.js";
export { bridgeTopicClip, cleanTopicForDisplay, type BridgeTopicClipInput } from "./bridgeTopicClip.js";
export { renderBridgeTopicBackdrop, type BridgeTopicBackdropOptions } from "./bridgeTopicBackdrop.js";
export { bridgeSubscribeCtaClip, type BridgeSubscribeCtaClipInput } from "./bridgeSubscribeCtaClip.js";
export { preOutroClip, type PreOutroClipInput } from "./preOutroClip.js";
export { brandLogoStingerClip, type BrandLogoStingerClipInput } from "./transitions/brandLogoStingerClip.js";
export { energyWhipStingerClip, type EnergyWhipStingerClipInput } from "./transitions/energyWhipStingerClip.js";
export { celebrationStingerClip, type CelebrationStingerClipInput } from "./transitions/celebrationStingerClip.js";
export { renderBrandLogoBadge, type RenderBrandLogoBadgeOptions } from "./transitions/brandLogoFallbackBadge.js";
export {
  roundTimingSeconds,
  toZeroBasedOffset,
  toZeroBasedDuration,
  normalizeSceneTimingToZeroBased,
  normalizeMascotTimelineEventsToZeroBased,
  assertZeroBasedTiming,
} from "./candyArcadeTiming.js";
export type { QuestionClipInput } from "./candyArcadeClipTypes.js";

export function mascotElement(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  phase: "intro" | "question" | "outro",
  options: Partial<Omit<ProductionMascotRenderOptions, "phase">> = {},
): string {
  return renderProductionMascotHtmlLayer(mascot, config, {
    phase,
    clipStartSeconds: options.clipStartSeconds ?? 0,
    clipDurationSeconds: options.clipDurationSeconds ?? 10,
    timelineEvents: options.timelineEvents,
    revealOutcome: options.revealOutcome,
    aspectRatio: options.aspectRatio ?? "16:9",
    sourceMapper: source,
    extraClass: options.extraClass,
    mediaMode: options.mediaMode,
  });
}

export function introClip(
  end: number,
  count: number,
  copy: Copy,
  mascot?: MascotProfile | null,
  mascotConfig?: ChannelMascotConfig | null,
  aspectRatio: MascotRenderAspectRatio = "16:9",
  mediaMode?: MascotStateMediaMode,
): string {
  if (end < 0.08) return "";
  const mascotHtml = mascotElement(mascot, mascotConfig, "intro", {
    clipStartSeconds: 0,
    clipDurationSeconds: end,
    aspectRatio,
    mediaMode,
  });
  const fallbackMascot = mascot || mascotHtml ? "" : `<div class="brand-mascot mascot-wave" data-layout-ignore aria-hidden="true">✦</div>`;
  return `<section id="candy-intro" class="clip candy-scene candy-intro" data-start="0" data-duration="${end.toFixed(3)}" data-track-index="0"><div class="intro-rays"></div><div class="intro-dot dot-a"></div><div class="intro-dot dot-b"></div><div class="intro-card"><span>${esc(copy.quizTime)}</span><h1>${esc(copy.ready)}</h1><p>${count} ${esc(copy.questions(count))}</p><div class="intro-stars" data-layout-ignore aria-hidden="true">✦&nbsp;&nbsp;★&nbsp;&nbsp;✦</div></div>${mascotHtml || fallbackMascot}</section>`;
}

export function outroClip(
  start: number,
  end: number,
  count: number,
  copy: Copy,
  mascot?: MascotProfile | null,
  mascotConfig?: ChannelMascotConfig | null,
  aspectRatio: MascotRenderAspectRatio = "16:9",
  mediaMode?: MascotStateMediaMode,
): string {
  const duration = Math.max(0.04, end - start);
  const mascotHtml = mascotElement(mascot, mascotConfig, "outro", {
    clipStartSeconds: 0,
    clipDurationSeconds: duration,
    aspectRatio,
    mediaMode,
  });
  return `<section id="candy-outro" class="clip candy-scene candy-outro" style="--clip-start: 0s;" data-start="${start.toFixed(3)}" data-duration="${duration.toFixed(3)}" data-track-index="0"><div class="intro-rays"></div><div class="outro-blob blob-a"></div><div class="outro-blob blob-b"></div><div class="outro-card"><span>${esc(copy.scorePrompt)}</span><h1>${esc(copy.playAgain)}</h1><p>${esc(copy.exploreMore)}</p><div class="outro-cta-badges"><span class="badge-cta badge-comment">💬 ${esc(copy.ctaComment)}</span><span class="badge-cta badge-like">👍 ${esc(copy.ctaLike)}</span><span class="badge-cta badge-sub">🔔 ${esc(copy.ctaSubscribe)}</span></div><div class="outro-stars" data-layout-ignore aria-hidden="true">★&nbsp;&nbsp;✦&nbsp;&nbsp;★</div></div>${mascotHtml}</section>`;
}

export function questionClip(input: QuestionClipInput): string {
  const { question, visual } = input;
  const timing: QuizSceneTiming = {
    countdownSeconds: input.countdownSeconds,
    start: input.start,
    questionNarrationStart: input.questionNarrationStart,
    choicesStart: input.choicesStart,
    thinkingStart: input.thinkingStart,
    timerHideAt: input.timerHideAt,
    revealStart: input.revealStart,
    rewardStart: input.rewardStart,
    end: input.end,
  };
  const localTiming = normalizeSceneTimingToZeroBased(timing);
  assertZeroBasedTiming(localTiming);

  const localMascotEvents = normalizeMascotTimelineEventsToZeroBased(input.mascotEvents, input.start);
  const mascotHtml = mascotElement(input.mascot, input.mascotConfig, "question", {
    clipStartSeconds: 0,
    clipDurationSeconds: localTiming.end,
    timelineEvents: localMascotEvents,
    revealOutcome: "correct",
    aspectRatio: input.aspectRatio ?? "16:9",
    mediaMode: input.mediaMode,
  });
  const mascotEnabled = Boolean(mascotHtml);
  const mascotPlacement = resolveChannelMascotPlacement(input.mascotConfig, input.aspectRatio ?? "16:9");
  const mascot = mascotEnabled ? { occupied: true as const, anchor: mascotPlacement.position } : { occupied: false as const, anchor: null };
  const model = adaptProductionQuizScene({
    question,
    questionIndex: input.questionIndex,
    totalQuestions: input.count,
    archetype: input.archetype,
    layoutResolution: input.layoutResolution,
    visual,
    timing: localTiming,
    atSeconds: 0,
    assets: input.assets,
    aspectRatio: input.aspectRatio ?? "16:9",
    mascot,
    styles: {
      thinkingBar: input.thinkingBarStyle,
      questionBox: input.questionBoxStyle,
      answerCard: input.answerCardStyle,
      counter: input.counterStyle,
      background: input.backgroundStyle,
    },
    styleCatalogRevision: input.styleCatalogRevision,
    channelBrandName: input.channelBrandName,
    brandVisible: Boolean(mascotHtml) || ((input.aspectRatio ?? "16:9") !== "9:16" && Boolean(input.channelBrandName?.trim())),
    isFinal: input.isFinal,
  });
  const parts = buildQuizSceneParts(model);
  const config = styleAttributes(
    visual,
    parts.question.layout,
    0,
    localTiming.choicesStart,
    localTiming.thinkingStart,
    localTiming.revealStart,
    localTiming.rewardStart,
    localTiming.end,
    localTiming.timerHideAt,
    localTiming.countdownSeconds,
  );
  const stableParts = renderStableQuizSceneParts(parts);
  const choicesHtml = renderQuizSceneChoicePart(parts, { revealMode: "scheduled" });
  const mascotClass = model.mascot.occupied ? "has-mascot" : "";
  const isUnified = isUnifiedQuizFrame(model.layout.id, model.aspectRatio);
  const classNames = [
    "clip",
    "candy-scene",
    "quiz-question-clip",
    input.questionIndex === 0 ? "quiz-first-question" : "",
    isUnified ? "quiz-frame-unified" : "",
    `layout-${model.layout.id}`,
    `archetype-${question.format}`,
    motionCssClass(visual.motionId),
    input.isFinal ? "is-final-scene" : "",
    mascotClass,
  ]
    .filter(Boolean)
    .join(" ");
  const thinkingHtml = renderQuizSceneThinkingPart(parts, localTiming);
  const factHtml = `<div class="fact-card" data-layout-allow-occlusion><p>${esc(parts.phase.factText)}</p></div>`;
  const phaseHtml = renderQuizScenePhaseParts({
    layoutId: model.layout.id,
    aspectRatio: "16:9",
    thinkingHtml,
    factHtml,
  });
  const layoutBody = renderQuizLayoutBody(model.layout.id, {
    questionBoxHtml: stableParts.questionBoxHtml,
    heroHtml: stableParts.heroHtml,
    choicesHtml,
    phaseHtml,
  });
  const body = `<div class="game-stage" data-layout-allow-overflow>${layoutBody}</div>`;
  const revealAtSeconds = Math.max(0, input.revealStart - input.start).toFixed(3);
  return `<section id="quiz-q${question.number}-${Math.round(input.start * 1000)}" class="${classNames}" ${config} data-start="${input.start.toFixed(3)}" data-duration="${Math.max(0.04, input.end - input.start).toFixed(3)}" data-track-index="0" data-reveal-at="${revealAtSeconds}">${renderQuizSceneBackground(parts, "production", { questionIndex: input.questionIndex, clipStart: 0, duration: localTiming.end })}<header class="game-header" data-quiz-fixed="counter" data-layout-allow-occlusion>${stableParts.counterBadgeHtml}</header>${body}${stableParts.brandMarkHtml}${mascotHtml}${rewardFx(input.isFinal ? "big" : "small")}</section>`;
}
