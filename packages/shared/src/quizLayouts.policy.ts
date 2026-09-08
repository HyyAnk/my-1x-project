import type { DirectorArchetype, QuizQuestionFormat } from "./enums.js";
import type { QuizGameplayArchetypeId } from "./quizArchetypes.js";
import type { MascotRenderAspectRatio } from "./mascot/renderTypes.js";
import {
  QUIZ_LAYOUT_CATALOG,
  QUIZ_LAYOUTS,
  QUIZ_LANDSCAPE_LAYOUT_IDS,
  isResolvedQuizLayoutId,
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

export function getCompatibleQuizLayout(currentLayoutId: ResolvedQuizLayoutId, targetAspectRatio: "16:9" | "9:16"): ResolvedQuizLayoutId {
  if (targetAspectRatio !== "16:9") {
    throw new Error("Quiz layouts support 16:9 landscape only");
  }
  return currentLayoutId;
}

export function filterQuizLayoutsByAspectRatio(aspectRatio?: "16:9" | "9:16"): readonly ResolvedQuizLayoutId[] {
  if (aspectRatio === "9:16") return [];
  return QUIZ_LANDSCAPE_LAYOUT_IDS;
}

export function resolveQuizLayout(input: QuizLayoutResolutionInput): QuizLayoutResolutionResult<ResolvedQuizLayoutId> {
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
            QUIZ_LAYOUTS.map((layout) => layout.id),
            `Layout ${String(input.requestedLayout)} is not active in the current layout catalog.`,
            "Choose an active production layout or configure layout capabilities.",
          ),
        ],
      };
    }
    const compatibility = evaluateQuizLayoutCompatibility({ ...compatibilityInput, layoutId: input.requestedLayout });
    return compatibility.compatible
      ? { ok: true, layoutId: input.requestedLayout, source: "explicit", capability: compatibility.layout }
      : { ok: false, requestedLayout: input.requestedLayout, source: "explicit", issues: compatibility.issues };
  }

  const autoCandidates = LANDSCAPE_QUIZ_AUTO_CANDIDATES;
  const preferred = preferredAutoLayout(input.archetype, input.questionFormat, {
    aspectRatio,
    choiceCount: input.choiceCount,
    media,
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
        QUIZ_LAYOUTS.map((layout) => layout.id),
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
      },
  maybeQuestionFormat?: QuizQuestionFormat,
  _maybeOptions?: PreferredAutoLayoutOptions,
): ResolvedQuizLayoutId {
  let archetype: AnyQuizArchetype;
  let questionFormat: QuizQuestionFormat;

  if (typeof archetypeOrInput === "object" && archetypeOrInput !== null) {
    archetype = archetypeOrInput.archetype;
    questionFormat = archetypeOrInput.questionFormat;
  } else {
    archetype = archetypeOrInput;
    questionFormat = maybeQuestionFormat!;
  }

  const archetypeStr = String(archetype);

  if (archetypeStr === "clue_deduction") {
    return "clue_deduction";
  }
  if (questionFormat === "true_false" || archetypeStr === "true_false") {
    return "verdict_true_false";
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
