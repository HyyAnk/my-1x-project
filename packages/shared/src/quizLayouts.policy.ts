import { isLegacyVerdictIdentifier, normalizeLegacyVerdictIdentifier, type DirectorArchetype, type QuizQuestionFormat } from "./enums.js";
import type { QuizGameplayArchetypeId } from "./quizArchetypes.js";
import type { MascotRenderAspectRatio } from "./mascot/renderTypes.js";
import {
  QUIZ_LAYOUT_CATALOG,
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  isQuizPortraitLayoutId,
  isResolvedQuizLayoutId,
  quizLayoutsForAspectRatio,
  type QuizLandscapeLayoutId,
  type QuizPortraitLayoutId,
  type ResolvedQuizLayoutId,
} from "./quizLayouts.catalog.js";
import type {
  QuizChoicePresentation,
  QuizLayoutCompatibilityInput,
  QuizLayoutCompatibilityResult,
  QuizLayoutIncompatibility,
  QuizLayoutMediaKind,
  QuizLayoutResolutionInput,
  QuizLayoutResolutionResult,
} from "./quizLayouts.types.js";

export type AnyQuizArchetype = DirectorArchetype | QuizGameplayArchetypeId | (string & {});

export function quizChoicePresentationFor(archetype: AnyQuizArchetype, questionFormat: QuizQuestionFormat): QuizChoicePresentation {
  return archetype === "visual_multiple_choice" || questionFormat === "odd_one_out" ? "visual" : "text";
}

export function quizMediaForPresentation(presentation: QuizChoicePresentation): readonly QuizLayoutMediaKind[] {
  return presentation === "visual" ? ["choice"] : ["question"];
}

export function evaluateQuizLayoutCompatibility(
  input: QuizLayoutCompatibilityInput<ResolvedQuizLayoutId>,
): QuizLayoutCompatibilityResult<ResolvedQuizLayoutId> {
  const layout = QUIZ_LAYOUT_CATALOG[input.layoutId];
  const issues: QuizLayoutIncompatibility[] = [];
  const supportedMedia: readonly QuizLayoutMediaKind[] = layout.media.supported;
  const requiredMedia: readonly QuizLayoutMediaKind[] = layout.media.required;

  addUnsupportedIssue(issues, layout.supportedPresentations, input.choicePresentation, {
    code: "layout_choice_presentation_unsupported",
    capability: "choicePresentation",
    label: "choice presentation",
  });
  addUnsupportedIssue(issues, layout.supportedChoiceCounts, input.choiceCount, {
    code: "layout_choice_count_unsupported",
    capability: "choiceCount",
    label: "choice count",
  });
  addUnsupportedIssue(issues, layout.supportedFormats, input.questionFormat, {
    code: "layout_question_format_unsupported",
    capability: "questionFormat",
    label: "question format",
  });
  addUnsupportedIssue(issues, layout.supportedAspectRatios, input.aspectRatio, {
    code: "layout_aspect_ratio_unsupported",
    capability: "aspectRatio",
    label: "aspect ratio",
  });

  const unsupportedMedia = input.media.filter((media) => !supportedMedia.includes(media));
  if (unsupportedMedia.length) {
    issues.push(
      issue(
        "layout_media_unsupported",
        "media",
        unsupportedMedia,
        supportedMedia,
        `Layout ${layout.id} does not support requested media: ${unsupportedMedia.join(", ")}.`,
        "Choose a layout that supports the requested media presentation or change the media intent.",
      ),
    );
  }

  const missingMedia = requiredMedia.filter((media) => !input.media.includes(media));
  if (missingMedia.length) {
    issues.push(
      issue(
        "layout_required_media_missing",
        "media",
        input.media,
        requiredMedia,
        `Layout ${layout.id} requires media: ${missingMedia.join(", ")}.`,
        "Provide the required media intent or choose a layout whose media requirement matches the question.",
      ),
    );
  }

  return issues.length ? { compatible: false, layout, issues } : { compatible: true, layout };
}

export const LANDSCAPE_QUIZ_AUTO_CANDIDATES: readonly ResolvedQuizLayoutId[] = QUIZ_LANDSCAPE_LAYOUT_IDS;
export const PORTRAIT_QUIZ_AUTO_CANDIDATES: readonly ResolvedQuizLayoutId[] = QUIZ_PORTRAIT_LAYOUT_IDS;

/**
 * Landscape and portrait layouts are distinct catalogs, so crossing the aspect ratio
 * boundary always maps onto the closest layout of the target catalog.
 */
const LANDSCAPE_TO_PORTRAIT: Record<QuizLandscapeLayoutId, QuizPortraitLayoutId> = {
  media_left_choices_right: "short_media_top_choices",
  visual_choices_three: "short_versus_two",
  visual_choices_three_pure: "short_versus_two",
  split_versus_two: "short_versus_two",
  verdict_yes_no: "short_verdict_yes_no",
  full_stack_list: "short_stack_list",
  mystery_reveal: "short_media_top_choices",
};

const PORTRAIT_TO_LANDSCAPE: Record<QuizPortraitLayoutId, QuizLandscapeLayoutId> = {
  short_stack_list: "full_stack_list",
  short_media_top_choices: "media_left_choices_right",
  short_versus_two: "split_versus_two",
  short_verdict_yes_no: "verdict_yes_no",
};

export function getCompatibleQuizLayout(currentLayoutId: ResolvedQuizLayoutId, targetAspectRatio: "16:9"): QuizLandscapeLayoutId;
export function getCompatibleQuizLayout(currentLayoutId: ResolvedQuizLayoutId, targetAspectRatio: "9:16"): QuizPortraitLayoutId;
export function getCompatibleQuizLayout(currentLayoutId: ResolvedQuizLayoutId, targetAspectRatio: "16:9" | "9:16"): ResolvedQuizLayoutId;
export function getCompatibleQuizLayout(currentLayoutId: ResolvedQuizLayoutId, targetAspectRatio: "16:9" | "9:16"): ResolvedQuizLayoutId {
  if (isQuizPortraitLayoutId(currentLayoutId)) {
    return targetAspectRatio === "9:16" ? currentLayoutId : PORTRAIT_TO_LANDSCAPE[currentLayoutId];
  }
  return targetAspectRatio === "9:16" ? LANDSCAPE_TO_PORTRAIT[currentLayoutId] : currentLayoutId;
}

export function filterQuizLayoutsByAspectRatio(aspectRatio?: "16:9" | "9:16"): readonly ResolvedQuizLayoutId[] {
  if (aspectRatio === "9:16") return QUIZ_PORTRAIT_LAYOUT_IDS;
  return QUIZ_LANDSCAPE_LAYOUT_IDS;
}

function normalizeLegacyResolutionInput(input: QuizLayoutResolutionInput): QuizLayoutResolutionInput {
  return {
    ...input,
    requestedLayout: normalizeLegacyVerdictIdentifier(input.requestedLayout) as QuizLayoutResolutionInput["requestedLayout"],
    questionFormat: normalizeLegacyVerdictIdentifier(input.questionFormat) as QuizQuestionFormat,
    archetype: normalizeLegacyVerdictIdentifier(input.archetype),
  };
}

export function resolveQuizLayout(rawInput: QuizLayoutResolutionInput): QuizLayoutResolutionResult<ResolvedQuizLayoutId> {
  const input = normalizeLegacyResolutionInput(rawInput);
  const choicePresentation = input.choicePresentation ?? quizChoicePresentationFor(input.archetype, input.questionFormat);
  const aspectRatio = input.aspectRatio ?? "16:9";
  const media = input.media ?? quizMediaForPresentation(choicePresentation);
  const compatibilityInput = {
    choicePresentation,
    choiceCount: input.choiceCount,
    questionFormat: input.questionFormat,
    aspectRatio,
    media,
  } as const;

  if (input.requestedLayout !== "auto") {
    if (!isResolvedQuizLayoutId(input.requestedLayout)) {
      return {
        ok: false,
        requestedLayout: input.requestedLayout,
        source: "explicit",
        issues: [
          issue(
            "layout_no_compatible_candidate",
            "layout",
            input.requestedLayout,
            quizLayoutsForAspectRatio(aspectRatio).map((layout) => layout.id),
            `Layout ${String(input.requestedLayout)} is not active in the current layout catalog.`,
            "Choose an active production layout or configure layout capabilities.",
          ),
        ],
      };
    }

    if (input.answerMode === "single_reveal" && input.requestedLayout !== "mystery_reveal") {
      return {
        ok: false,
        requestedLayout: input.requestedLayout,
        source: "explicit",
        issues: [
          issue(
            "layout_choice_count_unsupported",
            "choiceCount",
            1,
            QUIZ_LAYOUT_CATALOG[input.requestedLayout].supportedChoiceCounts,
            `Layout ${input.requestedLayout} does not support single reveal answer mode.`,
            "Use layout mystery_reveal for single reveal questions.",
          ),
        ],
      };
    }

    if (input.requestedLayout === "mystery_reveal" && (input.answerMode === "choice_selection" || input.choiceCount > 1)) {
      return {
        ok: false,
        requestedLayout: input.requestedLayout,
        source: "explicit",
        issues: [
          issue(
            "layout_choice_count_unsupported",
            "choiceCount",
            input.choiceCount,
            [1],
            `Mystery Reveal requires exactly one choice and single_reveal answer mode, received ${input.choiceCount} choices.`,
            "Regenerate as a single-reveal Mystery question.",
          ),
        ],
      };
    }

    const compatibility = evaluateQuizLayoutCompatibility({ ...compatibilityInput, layoutId: input.requestedLayout });
    return compatibility.compatible
      ? { ok: true, layoutId: input.requestedLayout, source: "explicit", capability: compatibility.layout }
      : { ok: false, requestedLayout: input.requestedLayout, source: "explicit", issues: compatibility.issues };
  }

  const autoCandidates = aspectRatio === "9:16" ? PORTRAIT_QUIZ_AUTO_CANDIDATES : LANDSCAPE_QUIZ_AUTO_CANDIDATES;
  const preferred = preferredAutoLayout(input.archetype, input.questionFormat, {
    aspectRatio,
    choiceCount: input.choiceCount,
    media,
    answerMode: input.answerMode,
  });
  const candidates = [preferred, ...autoCandidates.filter((layoutId) => layoutId !== preferred)];
  for (const layoutId of candidates) {
    const compatibility = evaluateQuizLayoutCompatibility({ ...compatibilityInput, layoutId });
    if (compatibility.compatible) return { ok: true, layoutId, source: "auto", capability: compatibility.layout };
  }

  return {
    ok: false,
    requestedLayout: "auto",
    source: "auto",
    issues: [
      issue(
        "layout_no_compatible_candidate",
        "layout",
        "auto",
        quizLayoutsForAspectRatio(aspectRatio).map((layout) => layout.id),
        "No production quiz layout is compatible with the requested question capabilities.",
        "Change the question capabilities or add support through a separately approved layout migration.",
      ),
    ],
  };
}

export type PreferredAutoLayoutOptions = {
  aspectRatio?: MascotRenderAspectRatio;
  choiceCount?: number;
  media?: readonly QuizLayoutMediaKind[];
  answerMode?: import("./quizAnswerMode.js").QuizAnswerMode;
};

export function preferredAutoLayout(
  archetype: AnyQuizArchetype,
  questionFormat: QuizQuestionFormat,
  options?: PreferredAutoLayoutOptions,
): ResolvedQuizLayoutId;
export function preferredAutoLayout(input: {
  archetype: AnyQuizArchetype;
  questionFormat: QuizQuestionFormat;
  aspectRatio?: MascotRenderAspectRatio;
  choiceCount?: number;
  media?: readonly QuizLayoutMediaKind[];
  answerMode?: import("./quizAnswerMode.js").QuizAnswerMode;
}): ResolvedQuizLayoutId;
export function preferredAutoLayout(
  archetypeOrInput:
    | AnyQuizArchetype
    | {
        archetype: AnyQuizArchetype;
        questionFormat: QuizQuestionFormat;
        aspectRatio?: MascotRenderAspectRatio;
        choiceCount?: number;
        media?: readonly QuizLayoutMediaKind[];
        answerMode?: import("./quizAnswerMode.js").QuizAnswerMode;
      },
  maybeQuestionFormat?: QuizQuestionFormat,
  maybeOptions?: PreferredAutoLayoutOptions,
): ResolvedQuizLayoutId {
  let archetype: AnyQuizArchetype;
  let questionFormat: QuizQuestionFormat;
  let options: PreferredAutoLayoutOptions | undefined;

  if (typeof archetypeOrInput === "object" && archetypeOrInput !== null) {
    archetype = archetypeOrInput.archetype;
    questionFormat = archetypeOrInput.questionFormat;
    options = archetypeOrInput;
  } else {
    archetype = archetypeOrInput;
    questionFormat = maybeQuestionFormat!;
    options = maybeOptions;
  }

  const archetypeStr = String(archetype);

  if (options?.aspectRatio === "9:16") {
    return preferredPortraitAutoLayout(archetypeStr, questionFormat, options);
  }

  if (options?.answerMode === "single_reveal" || options?.choiceCount === 1) {
    return "mystery_reveal";
  }

  if (
    questionFormat === "yes_no" ||
    archetypeStr === "yes_no" ||
    archetypeStr === "verdict_yes_no" ||
    isLegacyVerdictIdentifier(archetypeStr)
  ) {
    return "verdict_yes_no";
  }
  if (questionFormat === "odd_one_out") {
    return "visual_choices_three_pure";
  }
  if (archetypeStr === "visual_multiple_choice") {
    return "visual_choices_three";
  }
  if (archetypeStr === "mystery_reveal" || archetypeStr === "visual_reveal" || archetypeStr === "image_guess") {
    return "mystery_reveal";
  }
  return "media_left_choices_right";
}

function preferredPortraitAutoLayout(
  archetypeStr: string,
  questionFormat: QuizQuestionFormat,
  options: PreferredAutoLayoutOptions,
): ResolvedQuizLayoutId {
  if (
    questionFormat === "yes_no" ||
    archetypeStr === "yes_no" ||
    archetypeStr === "verdict_yes_no" ||
    isLegacyVerdictIdentifier(archetypeStr)
  ) {
    return "short_verdict_yes_no";
  }
  const wantsChoiceMedia = options.media?.includes("choice") ?? false;
  if (
    wantsChoiceMedia ||
    archetypeStr === "versus_faceoff" ||
    archetypeStr === "visual_multiple_choice" ||
    questionFormat === "odd_one_out"
  ) {
    return "short_versus_two";
  }
  const wantsQuestionMedia = options.media?.includes("question") ?? false;
  if (
    wantsQuestionMedia ||
    questionFormat === "image_guess" ||
    archetypeStr === "deep_trivia" ||
    archetypeStr === "visual_identification"
  ) {
    return "short_media_top_choices";
  }
  return "short_stack_list";
}

function addUnsupportedIssue<T extends string | number>(
  issues: QuizLayoutIncompatibility[],
  supported: readonly T[],
  actual: T,
  metadata: Pick<QuizLayoutIncompatibility, "code" | "capability"> & { label: string },
) {
  if (supported.includes(actual)) return;
  issues.push(
    issue(
      metadata.code,
      metadata.capability,
      actual,
      supported,
      `Layout capability does not support ${metadata.label} ${String(actual)}.`,
      `Choose a layout whose supported ${metadata.label} includes ${String(actual)}.`,
    ),
  );
}

function issue(
  code: QuizLayoutIncompatibility["code"],
  capability: QuizLayoutIncompatibility["capability"],
  actual: QuizLayoutIncompatibility["actual"],
  supported: QuizLayoutIncompatibility["supported"],
  message: string,
  nextAction: string,
): QuizLayoutIncompatibility {
  return { code, capability, actual, supported, message, nextAction };
}
