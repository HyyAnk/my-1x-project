import type { DirectorArchetype, QuizQuestionFormat } from "./enums.js";
import { QUIZ_LAYOUT_CATALOG, QUIZ_LAYOUTS, type ResolvedQuizLayoutId } from "./quizLayouts.catalog.js";
import type {
  QuizChoicePresentation,
  QuizLayoutCompatibilityInput,
  QuizLayoutCompatibilityResult,
  QuizLayoutIncompatibility,
  QuizLayoutMediaKind,
  QuizLayoutResolutionInput,
  QuizLayoutResolutionResult,
} from "./quizLayouts.types.js";

export function quizChoicePresentationFor(archetype: DirectorArchetype, questionFormat: QuizQuestionFormat): QuizChoicePresentation {
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

export function resolveQuizLayout(input: QuizLayoutResolutionInput): QuizLayoutResolutionResult<ResolvedQuizLayoutId> {
  const choicePresentation = input.choicePresentation ?? quizChoicePresentationFor(input.archetype, input.questionFormat);
  const compatibilityInput = {
    choicePresentation,
    choiceCount: input.choiceCount,
    questionFormat: input.questionFormat,
    aspectRatio: input.aspectRatio ?? "16:9",
    media: input.media ?? quizMediaForPresentation(choicePresentation),
  } as const;

  if (input.requestedLayout !== "auto") {
    const compatibility = evaluateQuizLayoutCompatibility({ ...compatibilityInput, layoutId: input.requestedLayout });
    return compatibility.compatible
      ? { ok: true, layoutId: input.requestedLayout, source: "explicit", capability: compatibility.layout }
      : { ok: false, requestedLayout: input.requestedLayout, source: "explicit", issues: compatibility.issues };
  }

  const preferred = preferredAutoLayout(input.archetype, input.questionFormat);
  const autoCandidates: readonly ResolvedQuizLayoutId[] = ["media_left_choices_right", "visual_choices_three"];
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

function preferredAutoLayout(archetype: DirectorArchetype, questionFormat: QuizQuestionFormat): ResolvedQuizLayoutId {
  return archetype === "visual_multiple_choice" || questionFormat === "odd_one_out" ? "visual_choices_three" : "media_left_choices_right";
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
