import type { DirectorArchetype, QuizQuestionFormat } from "./enums.js";
import type { QuizGameplayArchetypeId } from "./quizArchetypes.js";
import type { MascotRenderAspectRatio } from "./mascot/renderTypes.js";
import { QUIZ_LAYOUT_CATALOG, QUIZ_LAYOUTS, isResolvedQuizLayoutId, type ResolvedQuizLayoutId } from "./quizLayouts.catalog.js";
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
  return (archetype as string) === "visual_multiple_choice" || questionFormat === "odd_one_out" ? "visual" : "text";
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

export const PORTRAIT_QUIZ_AUTO_CANDIDATES: readonly ResolvedQuizLayoutId[] = [
  "portrait_hero_choices",
  "portrait_split_versus",
  "portrait_verdict_tf",
  "portrait_stack_list",
];

export const LANDSCAPE_QUIZ_AUTO_CANDIDATES: readonly ResolvedQuizLayoutId[] = [
  "media_left_choices_right",
  "visual_choices_three",
  "visual_choices_three_pure",
  "split_versus_two",
  "verdict_true_false",
  "full_stack_list",
  "mystery_reveal",
  "clue_deduction",
];

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

  if (aspectRatio === "9:16" && (input.questionFormat === "odd_one_out" || (input.archetype as string) === "visual_spotting")) {
    return {
      ok: false,
      requestedLayout: input.requestedLayout,
      source: input.requestedLayout === "auto" ? "auto" : "explicit",
      issues: [
        issue(
          "layout_question_format_unsupported",
          "questionFormat",
          input.questionFormat,
          ["multiple_choice", "image_guess", "true_false"],
          "The 3-image format 'odd_one_out' and archetype 'visual_spotting' are strictly disallowed in 9:16 portrait video. Vertical videos only support 4 single-hero and list layouts.",
          "Use a 16:9 landscape aspect ratio for 3-image visual choices, or change question format to multiple_choice, image_guess, or true_false.",
        ),
      ],
    };
  }

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
            `Layout ${input.requestedLayout} is not active in the current layout catalog.`,
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

  const autoCandidates = aspectRatio === "9:16" ? PORTRAIT_QUIZ_AUTO_CANDIDATES : LANDSCAPE_QUIZ_AUTO_CANDIDATES;
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
  maybeOptions?: PreferredAutoLayoutOptions,
): ResolvedQuizLayoutId {
  let archetype: AnyQuizArchetype;
  let questionFormat: QuizQuestionFormat;
  let aspectRatio: MascotRenderAspectRatio = "16:9";
  let choiceCount: number | undefined;
  let media: readonly QuizLayoutMediaKind[] = [];

  if (typeof archetypeOrInput === "object" && archetypeOrInput !== null) {
    archetype = archetypeOrInput.archetype;
    questionFormat = archetypeOrInput.questionFormat;
    aspectRatio = archetypeOrInput.aspectRatio ?? "16:9";
    choiceCount = archetypeOrInput.choiceCount;
    media = archetypeOrInput.media ?? [];
  } else {
    archetype = archetypeOrInput;
    questionFormat = maybeQuestionFormat!;
    aspectRatio = maybeOptions?.aspectRatio ?? "16:9";
    choiceCount = maybeOptions?.choiceCount;
    media = maybeOptions?.media ?? [];
  }

  const archetypeStr = String(archetype);

  if (aspectRatio === "9:16") {
    if (questionFormat === "true_false" || archetypeStr === "true_false") {
      return "portrait_verdict_tf";
    }
    if (choiceCount === 2 || archetypeStr === "versus_faceoff") {
      return "portrait_split_versus";
    }
    if (
      media.includes("question") ||
      media.includes("choice") ||
      questionFormat === "image_guess"
    ) {
      return "portrait_hero_choices";
    }
    return "portrait_stack_list";
  }

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
