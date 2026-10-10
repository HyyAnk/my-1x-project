import type { MascotRenderAspectRatio } from "@studio/shared";
import { motionCssClass } from "../../visual/candyArcade.js";
import { isPortraitQuizFrame, isUnifiedQuizFrame } from "../frame/renderQuizFrameBody.js";
import { renderProgressStrip } from "../frame/progressStrip.js";
import type { QuizSceneParts } from "../scene/buildQuizSceneParts.js";
import { renderQuizSceneThinkingPart } from "../scene/renderQuizSceneParts.js";
import type { QuizSceneRenderModel, QuizSceneTiming } from "../scene/quizScene.types.js";
import type { QuizTemplateScene } from "../../visual/types.js";
import type { MascotVisibilityPolicy } from "../productionMascotTimeline.js";
import { renderShortRingTimer } from "./shortRingTimer.js";
import type { CandyArcadeProductKind } from "./candyArcadeClipTypes.js";

export type QuestionClipFrameProfile = {
  productKind: CandyArcadeProductKind;
  aspectRatio: MascotRenderAspectRatio;
  isShort: boolean;
  mascotVisibility: MascotVisibilityPolicy;
};

export function resolveQuestionClipFrameProfile(input: {
  productKind?: CandyArcadeProductKind;
  aspectRatio?: MascotRenderAspectRatio;
}): QuestionClipFrameProfile {
  const productKind = input.productKind ?? "episode";
  const isShort = productKind === "quiz_short";
  return {
    productKind,
    aspectRatio: input.aspectRatio ?? "16:9",
    isShort,
    mascotVisibility: isShort ? "reveal_only" : "always",
  };
}

/** Quiz Shorts show the segmented progress strip; Episodes keep the channel counter badge. */
export function renderQuestionClipHeader(profile: QuestionClipFrameProfile, parts: QuizSceneParts, counterBadgeHtml: string): string {
  const content = profile.isShort
    ? renderProgressStrip({
        questionNumber: parts.counter.questionNumber,
        totalQuestions: parts.counter.totalQuestions,
        paletteAccent: parts.counter.paletteAccent,
      })
    : counterBadgeHtml;
  return `<header class="game-header" data-quiz-fixed="counter" data-layout-allow-occlusion>${content}</header>`;
}

/** Quiz Shorts count down with the centered ring timer; Episodes use the channel thinking bar. */
export function renderQuestionClipThinkingPart(profile: QuestionClipFrameProfile, parts: QuizSceneParts, timing: QuizSceneTiming): string {
  return profile.isShort ? renderShortRingTimer(timing) : renderQuizSceneThinkingPart(parts, timing);
}

export function questionClipClassNames(input: {
  model: QuizSceneRenderModel;
  profile: QuestionClipFrameProfile;
  questionIndex: number;
  questionFormat: string;
  motionId: QuizTemplateScene["motionId"];
  isFinal: boolean;
}): string {
  const { model, profile } = input;
  const isUnified = isUnifiedQuizFrame(model.layout.id, model.aspectRatio);
  const isPortrait = isPortraitQuizFrame(model.layout.id, model.aspectRatio);
  return [
    "clip",
    "candy-scene",
    "quiz-question-clip",
    input.questionIndex === 0 ? "quiz-first-question" : "",
    isUnified ? "quiz-frame-unified" : "",
    isPortrait ? "quiz-frame-portrait" : "",
    profile.isShort ? "quiz-short-question" : "",
    `layout-${model.layout.id}`,
    `archetype-${input.questionFormat}`,
    motionCssClass(input.motionId),
    input.isFinal ? "is-final-scene" : "",
    model.mascot.occupied ? "has-mascot" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
