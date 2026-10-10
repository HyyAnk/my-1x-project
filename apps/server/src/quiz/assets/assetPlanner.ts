import {
  QuizAssetPlanSchema,
  type BridgeSceneConfig,
  type DirectorPlan,
  type MascotRenderAspectRatio,
  type QuizAssetPlan,
  type QuizImageStyle,
  type QuizV2,
} from "@studio/shared";
import { inferBeatAspectRatio } from "../layoutCompatibility.js";
import { QUIZ_STYLE_CONTRACTS } from "./promptCompiler.js";
import { resolveGraphicChoiceSubject } from "./choiceSubjectEnricher.js";
import { extractBridgeShowcaseItems } from "./bridgeTopicEntityExtractor.js";
import { compactQuizAssetSubject } from "./assetSubject.js";
import { planBeatAssets } from "./beatAssetPlanner.js";

export { QUIZ_ASSET_SUBJECT_MAX_LENGTH, compactQuizAssetSubject } from "./assetSubject.js";
export { resolveGraphicChoiceSubject };

export interface PlanQuizAssetsOptions {
  bridgeConfig?: BridgeSceneConfig;
  includeBridgeShowcase?: boolean;
  /** Product canvas. Defaults to the layout family of each beat (16:9 for Episodes). */
  aspectRatio?: MascotRenderAspectRatio;
}

export function planQuizAssets(
  quiz: QuizV2,
  director: DirectorPlan,
  visualStyle: QuizImageStyle = "pixar_3d",
  options?: PlanQuizAssetsOptions,
): QuizAssetPlan {
  const contract = QUIZ_STYLE_CONTRACTS[visualStyle] || QUIZ_STYLE_CONTRACTS.pixar_3d;
  const assets: QuizAssetPlan["assets"] = [];
  const consistencyGroups: QuizAssetPlan["consistency_groups"] = [];

  for (const beat of director.beats) {
    const question = quiz.questions.find((candidate) => candidate.id === beat.question_id);
    if (!question) continue;
    const canvasAspectRatio = options?.aspectRatio ?? inferBeatAspectRatio(beat);
    const beatPlan = planBeatAssets(question, beat, contract, canvasAspectRatio);
    assets.push(...beatPlan.assets);
    consistencyGroups.push(...beatPlan.consistencyGroups);
  }

  if (shouldIncludeBridgeShowcase(options)) assets.push(...planBridgeShowcaseAssets(quiz, visualStyle, options));

  return QuizAssetPlanSchema.parse({ schema_version: 2, episode_id: quiz.episode_id, assets, consistency_groups: consistencyGroups });
}

function shouldIncludeBridgeShowcase(options?: PlanQuizAssetsOptions): boolean {
  if (options?.includeBridgeShowcase === true) return true;
  if (options?.includeBridgeShowcase === false) return false;
  return Boolean(options?.bridgeConfig && options.bridgeConfig.enabled !== false && options.bridgeConfig.enableTopicScene !== false);
}

function planBridgeShowcaseAssets(quiz: QuizV2, visualStyle: QuizImageStyle, options?: PlanQuizAssetsOptions): QuizAssetPlan["assets"] {
  const showcaseItems = extractBridgeShowcaseItems(quiz, { bridgeConfig: options?.bridgeConfig, visualStyle });
  return showcaseItems.map((item) => ({
    asset_id: item.asset_id,
    question_id: null,
    subject: compactQuizAssetSubject(item.subject, "Showcase item"),
    purpose: "bridge_topic_item",
    style: item.presentation === "die_cut_sticker" ? "cute_illustration" : "photo_reference",
    // Showcase cards are square frames with a themed backdrop; never request matting.
    aspect_ratio: "1:1",
    transparent_background: false,
    required: false,
    semantic_key: `bridge:showcase:${item.asset_id}`,
    consistency_group_id: null,
  }));
}
