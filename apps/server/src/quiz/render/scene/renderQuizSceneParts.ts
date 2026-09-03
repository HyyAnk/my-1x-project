import {
  resolveAnswerCardSkin,
  resolveBackgroundVariant,
  resolveCounterBadgeVariant,
  resolveQuestionBoxVariant,
  resolveThinkingBarVariant,
} from "../../visual/elements/index.js";
import { renderChoiceGroup } from "../choices/renderChoiceGroup.js";
import type { ChoiceRevealMode } from "../choices/choiceGroup.types.js";
import { renderChannelBrandMark } from "../candyArcade/channelBrandMark.js";
import { escAttr, illustrationDataUri } from "../candyArcade/candyArcadeSvg.js";
import type { QuizSceneParts } from "./buildQuizSceneParts.js";
import type { QuizSceneTiming } from "./quizScene.types.js";
import type { BackgroundRenderContext } from "../../visual/elements/background/types.js";

export function renderStableQuizSceneParts(parts: QuizSceneParts) {
  const questionBoxHtml = resolveQuestionBoxVariant(parts.question.style, undefined, parts.styleCatalogRevision).renderHtml({
    question: parts.question.text,
    tier: parts.question.layout.tier,
    questionNumber: parts.question.number,
    paletteAccent: parts.question.paletteAccent,
    highlightedHtml: parts.question.highlightedHtml,
    visualOpportunity: parts.question.visualOpportunity,
  });
  const counterBadgeHtml = resolveCounterBadgeVariant(parts.counter.style, undefined, parts.styleCatalogRevision).renderHtml({
    questionNumber: parts.counter.questionNumber,
    totalQuestions: parts.counter.totalQuestions,
    paletteAccent: parts.counter.paletteAccent,
    isFinal: parts.counter.isFinal,
  });
  return {
    questionBoxHtml,
    counterBadgeHtml,
    heroHtml: renderSceneMedia(parts.hero, "hero-image"),
    brandMarkHtml: renderChannelBrandMark(parts.brand.name, parts.brand.visible, parts.brand.aspectRatio),
  };
}

export function renderQuizSceneThinkingPart(parts: QuizSceneParts, timing: QuizSceneTiming): string {
  return resolveThinkingBarVariant(parts.phase.thinkingStyle, undefined, parts.styleCatalogRevision).renderHtml({
    clipStart: timing.start,
    questionNarrationStart: timing.questionNarrationStart,
    revealStart: timing.revealStart,
    thinkingStart: timing.thinkingStart,
    duration: timing.end - timing.start,
    questionNumber: parts.counter.questionNumber,
    paletteAccent: parts.question.paletteAccent,
  });
}

export function renderQuizSceneChoicePart(parts: QuizSceneParts, options: { revealMode?: ChoiceRevealMode } = {}): string {
  return renderChoiceGroup({
    ...parts.choices,
    revealMode: options.revealMode,
    skin: resolveAnswerCardSkin(parts.choices.style, parts.styleCatalogRevision),
  });
}

export function renderQuizSceneBackground(
  parts: QuizSceneParts,
  surface: "production" | "sandbox",
  context?: Partial<BackgroundRenderContext>,
): string {
  return resolveBackgroundVariant(parts.background.style, parts.styleCatalogRevision).renderHtml({
    surface,
    questionIndex: parts.background.questionIndex,
    palette: parts.background.palette,
    ...context,
  });
}

export function renderSceneMedia(media: QuizSceneParts["hero"], className: string): string {
  const source = media.source ?? illustrationDataUri(media.fallback.subject, media.fallback.seed);
  return `<figure class="image-card ${className}" data-layout-allow-overflow><img src="${escAttr(source)}" alt="${escAttr(media.altText)}"><span class="image-shine"></span></figure>`;
}
