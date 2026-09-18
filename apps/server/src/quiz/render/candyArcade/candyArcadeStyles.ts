import {
  answerCardPresentationContractCss,
  getAnswerCardsCss,
  getAnswerCardSkinsCss,
  getBackgroundStylesCss,
  getSelectedBackgroundStylesCss,
  getCounterBadgesCss,
  getQuestionBoxesCss,
  getThinkingBarsCss,
  semanticBackgroundLayerCss,
} from "../../visual/elements/index.js";

export {
  getAnswerCardsCss,
  getAnswerCardSkinsCss,
  getBackgroundStylesCss,
  getSelectedBackgroundStylesCss,
  getCounterBadgesCss,
  getQuestionBoxesCss,
  getThinkingBarsCss,
};
import {
  getQuizPreviewLayoutCapability,
  MASCOT_CANVAS_SIZES,
  type MascotRenderAspectRatio,
  type QuizBackgroundStyle,
  type QuizPreviewLayoutId,
} from "@studio/shared";
import { candyArcadeFontFaceCss, type CandyArcadeFontMode } from "./candyArcadeFonts.js";
import { autoInjectFontFaces, candyArcadeSystemFontFaceCss } from "./candyArcadeFontFaceInjection.js";
import { channelBrandMarkCss } from "./channelBrandMarkStyles.js";
import { productionMascotCss } from "./productionMascotStyles.js";
import { quizLayoutCss } from "../layouts/registry.js";
import { quizFrameCss } from "../frame/quizFrameStyles.js";
import {
  baseChoiceStyles,
  choiceIdentityStyles,
  choiceStateStyles,
  choiceTypographyStyles,
  detachedChoiceStyles,
} from "../choices/index.js";
import { imageSlotStyles } from "../layouts/imageSlotStyles.js";
import {
  candyArcadeRootVarsCss,
  candyArcadeChoiceTokensCss,
  candyArcadeStageCss,
  candyArcadeAnimationCss,
  candyArcadeReducedMotionCss,
} from "./styles/index.js";

export function candyArcadeHeroAreaRatio(layout: QuizPreviewLayoutId, aspectRatio: MascotRenderAspectRatio = "16:9"): number {
  const canvas = MASCOT_CANVAS_SIZES[aspectRatio];
  const frameArea = canvas.width * canvas.height;
  const metrics = getQuizPreviewLayoutCapability(layout).metrics.render;
  return Number(((metrics.width * metrics.height * metrics.itemCount) / frameArea).toFixed(4));
}

export function candyArcadeCss(
  options: {
    fontMode?: CandyArcadeFontMode;
    aspectRatio?: MascotRenderAspectRatio;
    backgroundStyles?: Iterable<QuizBackgroundStyle | null | undefined>;
    styleCatalogRevision?: string;
  } = {},
): string {
  const aspectRatio = options.aspectRatio ?? "16:9";
  const canvas = MASCOT_CANVAS_SIZES[aspectRatio];
  const baselineRenderMetrics = getQuizPreviewLayoutCapability("baseline").metrics.render;

  const rawCss = `
${candyArcadeFontFaceCss(options.fontMode ?? "render")}
${candyArcadeSystemFontFaceCss()}
${candyArcadeRootVarsCss()}
${candyArcadeStageCss({ canvas, aspectRatio, baselineRenderMetrics })}

/* === Choice Components & State Styles (ADR-003) === */
${baseChoiceStyles()}
${detachedChoiceStyles()}
${choiceIdentityStyles()}
${choiceTypographyStyles()}
${choiceStateStyles()}
${candyArcadeChoiceTokensCss()}

${candyArcadeAnimationCss()}
${quizLayoutCss(aspectRatio)}
${imageSlotStyles()}
${productionMascotCss()}
${channelBrandMarkCss()}
${getThinkingBarsCss(options.styleCatalogRevision)}
${getQuestionBoxesCss(options.styleCatalogRevision)}
${getCounterBadgesCss(options.styleCatalogRevision)}
${getAnswerCardSkinsCss(options.styleCatalogRevision)}
${aspectRatio === "16:9" ? quizFrameCss() : ""}
${semanticBackgroundLayerCss()}
${options.backgroundStyles ? getSelectedBackgroundStylesCss(options.backgroundStyles, options.styleCatalogRevision) : getBackgroundStylesCss(options.styleCatalogRevision)}
${answerCardPresentationContractCss()}
${candyArcadeReducedMotionCss()}
`;

  return autoInjectFontFaces(rawCss);
}

export { autoInjectFontFaces, candyArcadeSystemFontFaceCss };
