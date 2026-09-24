import {
  QuizAssetPlanSchema,
  getQuizImageSlotGeometry,
  recommendImageSizing,
  resolveQuizLayoutAssetAspectRatio,
  type DirectorPlan,
  type PersistedImageSizing,
  type QuizAssetPlan,
  type QuizImageStyle,
  type QuizV2,
} from "@studio/shared";
import { resolveQuestionLayout } from "../layoutCompatibility.js";
import { QUIZ_STYLE_CONTRACTS, isGraphicIdentitySubject } from "./promptCompiler.js";

export const QUIZ_ASSET_SUBJECT_MAX_LENGTH = 280;

export function resolveGraphicChoiceSubject(
  choiceText: string,
  question: { question: string; visual_opportunity?: string },
): string {
  const combined = `${question.question} ${question.visual_opportunity || ""}`.toLowerCase();
  const text = choiceText.trim();
  if (/\b(flag|flags)\b/i.test(combined)) {
    if (!/\b(flag|flags)\b/i.test(text)) {
      return `Official national flag of ${text}, clean 2D graphic vector illustration`;
    }
  } else if (/\b(logo|logos|brand|brands)\b/i.test(combined)) {
    if (!/\b(logo|logos|brand)\b/i.test(text)) {
      return `Official minimalist vector brand logo of ${text}, clean graphic design icon`;
    }
  } else if (/\b(emblem|insignia|crest|monogram|symbol)\b/i.test(combined)) {
    if (!/\b(emblem|insignia|crest|symbol)\b/i.test(text)) {
      return `Official vector emblem or symbol of ${text}, clean graphic design mark`;
    }
  }
  return text;
}

export function planQuizAssets(quiz: QuizV2, director: DirectorPlan, visualStyle: QuizImageStyle = "pixar_3d"): QuizAssetPlan {
  const contract = QUIZ_STYLE_CONTRACTS[visualStyle] || QUIZ_STYLE_CONTRACTS.pixar_3d;
  const assets: QuizAssetPlan["assets"] = [];
  const consistencyGroups: QuizAssetPlan["consistency_groups"] = [];

  for (const beat of director.beats) {
    const question = quiz.questions.find((candidate) => candidate.id === beat.question_id);
    if (!question) continue;

    const layoutResolution = resolveQuestionLayout(question, beat);
    if (!layoutResolution.ok) {
      const reason = layoutResolution.issues.map((i) => i.message).join("; ");
      throw new Error(`Failed to resolve layout for question ${question.id}: ${reason}`);
    }
    const effectiveLayoutId = layoutResolution.layoutId;

    const heroGeometry = getQuizImageSlotGeometry({
      layoutId: effectiveLayoutId,
      purpose: "hero_question_image",
      presentation: layoutResolution.capability.supportedPresentations[0],
      choiceCount: question.choices.length,
      canvasAspectRatio: "16:9",
    });

    if (heroGeometry && beat.asset_intents.includes("question_illustration") && (question.visual_opportunity || question.question)) {
      const heroRec = recommendImageSizing(heroGeometry);
      const ratio = heroRec.ok ? heroRec.value.aspectRatio : resolveQuizLayoutAssetAspectRatio(effectiveLayoutId, "hero_question_image");
      const sizing: PersistedImageSizing | undefined = heroRec.ok
        ? {
            policy_version: 1,
            layout_id: effectiveLayoutId,
            geometry_key: heroGeometry.geometryKey,
            recommended_width: heroRec.value.recommended.width,
            recommended_height: heroRec.value.recommended.height,
          }
        : undefined;

      assets.push({
        asset_id: "asset-" + question.id + "-hero",
        question_id: question.id,
        subject: compactQuizAssetSubject(question.visual_opportunity || "", question.question),
        purpose: "hero_question_image",
        style: "cute_illustration",
        aspect_ratio: ratio,
        transparent_background:
          effectiveLayoutId === "mystery_reveal" ||
          beat.archetype === "mystery_reveal" ||
          beat.archetype === "visual_reveal" ||
          beat.archetype === "image_guess",
        required: true,
        semantic_key: question.id + ":hero_question_image",
        consistency_group_id: null,
        sizing,
      });
    }

    const isSingleReveal = effectiveLayoutId === "mystery_reveal" || question.answer_mode === "single_reveal";

    const choicePresentation =
      !isSingleReveal &&
      (beat.archetype === "visual_multiple_choice" ||
        question.format === "odd_one_out" ||
        (effectiveLayoutId === "split_versus_two" && beat.asset_intents.includes("choice_illustration")))
        ? "visual"
        : "text";

    const choiceGeometry = !isSingleReveal
      ? getQuizImageSlotGeometry({
          layoutId: effectiveLayoutId,
          purpose: "answer_option",
          presentation: choicePresentation,
          choiceCount: question.choices.length,
          canvasAspectRatio: "16:9",
        })
      : null;

    if (choiceGeometry && beat.asset_intents.includes("choice_illustration")) {
      const choiceRec = recommendImageSizing(choiceGeometry);
      const ratio = choiceRec.ok ? choiceRec.value.aspectRatio : resolveQuizLayoutAssetAspectRatio(effectiveLayoutId, "answer_option");
      const groupId = question.id + ":visual-answer-set";
      const optionAssetIds = question.choices.map((choice) => "asset-" + question.id + "-" + choice.id);
      const sizing: PersistedImageSizing | undefined = choiceRec.ok
        ? {
            policy_version: 1,
            layout_id: effectiveLayoutId,
            geometry_key: choiceGeometry.geometryKey,
            recommended_width: choiceRec.value.recommended.width,
            recommended_height: choiceRec.value.recommended.height,
          }
        : undefined;

      const isGraphicQuestion = isGraphicIdentitySubject(question.visual_opportunity || question.question);

      consistencyGroups.push({
        group_id: groupId,
        question_id: question.id,
        purpose: "visual_answer_set",
        style_family: isGraphicQuestion ? "2D clean vector graphic emblem and symbol design" : contract.styleFamily,
        rendering_medium: isGraphicQuestion ? "clean flat 2D graphic vector emblem, sharp silhouette, centered on solid background" : contract.renderingMedium,
        lighting: isGraphicQuestion ? "clean ambient studio lighting with zero shadows" : contract.lighting,
        framing: isGraphicQuestion ? "one centered isolated vector mark, high contrast, clean white background" : "one centered subject, eye-level, full silhouette visible",
        background_treatment: isGraphicQuestion ? "pure solid clean white background" : contract.optionBackground,
        subject_scale: "one large, clearly recognizable subject with a complete silhouette scaled to fill the card comfortably while keeping critical details within the layout-defined safe region, consistent in scale and lighting across every option in this set",
        contrast: "medium-high and matched across every option",
        saturation: "bright but matched across every option",
        edge_treatment: isGraphicQuestion ? "sharp, clean vector outlines" : contract.edgeTreatment,
        detail_level: isGraphicQuestion ? "clean minimalist vector art designed for instant brand and symbol clarity" : contract.detailLevel,
        face_policy: isGraphicQuestion ? "none" : "natural_only",
        asset_ids: optionAssetIds,
      });

      question.choices.forEach((choice) =>
        assets.push({
          asset_id: "asset-" + question.id + "-" + choice.id,
          question_id: question.id,
          subject: isGraphicQuestion ? resolveGraphicChoiceSubject(choice.text, question) : choice.text,
          purpose: "answer_option",
          style: "cute_illustration",
          aspect_ratio: ratio,
          transparent_background: true,
          required: true,
          semantic_key: question.id + ":choice:" + choice.id,
          consistency_group_id: groupId,
          sizing,
        }),
      );
    }
  }
  return QuizAssetPlanSchema.parse({ schema_version: 2, episode_id: quiz.episode_id, assets, consistency_groups: consistencyGroups });
}

/**
 * Image prompts can contain a complete camera/style brief, while the asset
 * schema deliberately keeps `subject` short and semantic. Preserve the first
 * complete descriptive clauses, then safely trim on a word boundary; the
 * prompt compiler supplies the shared visual-style contract separately.
 */
export function compactQuizAssetSubject(value: string, fallback: string): string {
  const normalized = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  const source = normalized || fallback.normalize("NFKC").replace(/\s+/g, " ").trim() || "Quiz subject";
  if (source.length <= QUIZ_ASSET_SUBJECT_MAX_LENGTH) return source;

  const clauses = source.split(/(?<=[,;:.!?])\s+/u);
  let compact = "";
  for (const clause of clauses) {
    const candidate = compact ? `${compact} ${clause}` : clause;
    if (candidate.length > QUIZ_ASSET_SUBJECT_MAX_LENGTH) break;
    compact = candidate;
  }
  if (compact.length >= 24) return compact.replace(/[,:;\-–—]+$/u, "").trim();

  const fragment = source.slice(0, QUIZ_ASSET_SUBJECT_MAX_LENGTH).trimEnd();
  const boundary = fragment.lastIndexOf(" ");
  const safe = boundary >= Math.floor(QUIZ_ASSET_SUBJECT_MAX_LENGTH * 0.55) ? fragment.slice(0, boundary) : fragment;
  return safe.replace(/[,:;\-–—]+$/u, "").trim() || "Quiz subject";
}
