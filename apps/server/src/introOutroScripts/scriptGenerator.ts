import {
  IntroOutroScriptContentSchema,
  IntroOutroScriptRevisionSchema,
  makeId,
  nowIso,
  type CreativeSeed,
  type IntroOutroClipKind,
  type IntroOutroScriptRevision,
  type IntroOutroSeedSelection,
  type IntroOutroValidationIssue,
  type MascotStyleIdentityProfile,
  type IntroOutroScriptContent,
  type ScriptQualityReview,
} from "@studio/shared";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { executeSinglePromptText } from "../utils/promptSanitizer.js";
import type { ResolvedIntroOutroContext } from "./contextResolver.js";
import { IntroOutroScriptError } from "./errors.js";
import { fingerprint } from "./fingerprint.js";
import { parseLlmJson } from "./jsonOutput.js";
import { buildScriptGenerationPrompt, INTRO_OUTRO_TEMPLATE_VERSION, mergeGeneratedContent } from "./promptCompiler.js";
import { hasBlockingIssues, validateScriptContent } from "./validation.js";
import { reviewScriptQuality } from "./qualityReview.js";

export async function generateIntroOutroScript(params: {
  client: LLMClient;
  context: ResolvedIntroOutroContext;
  identity: MascotStyleIdentityProfile;
  model: string;
  projectId: string;
  revisionNumber: number;
  clipKind: IntroOutroClipKind;
  durationSeconds: number;
  seedSelection: IntroOutroSeedSelection;
  seeds: CreativeSeed[];
  signal: AbortSignal;
  companionContent?: IntroOutroScriptContent;
  logoMode?: "post_overlay" | "supplied_reference" | "none";
  onProgress?: (step: string) => Promise<void>;
}): Promise<IntroOutroScriptRevision> {
  const prompt = buildScriptGenerationPrompt(params);
  const imageAttachments = [
    {
      path: params.context.mascotReference.absolutePath,
      mimeType: params.context.mascotReference.mimeType,
      role: "mascot_subject" as const,
    },
    ...(params.context.logoReference
      ? [
          {
            path: params.context.logoReference.absolutePath,
            mimeType: params.context.logoReference.mimeType,
            role: "channel_logo" as const,
          },
        ]
      : []),
  ];

  let lastError: unknown = null;
  let previousOutput = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    params.signal.throwIfAborted();
    await params.onProgress?.(`${attempt === 1 ? "Writing" : "Repairing"} ${params.clipKind} script (${attempt}/3)`);
    const effectivePrompt =
      attempt === 1
        ? prompt
        : `${prompt}\n\nREPAIR REQUEST\nThe previous response failed validation. Return a complete corrected JSON object only. Previous response:\n${previousOutput.slice(0, 12_000)}\nValidation error: ${lastError instanceof Error ? lastError.message : String(lastError)}`;
    previousOutput = await executeSinglePromptText(params.client, effectivePrompt, {
      modelOverride: params.model,
      signal: params.signal,
      timeoutMs: 180_000,
      requireCompleteOutput: true,
      imageAttachments,
    });

    try {
      const parsed = parseLlmJson(previousOutput);
      if (parsed.error_code === "MASCOT_REFERENCE_UNAVAILABLE") {
        throw new IntroOutroScriptError("Gemini Flash could not inspect the mascot reference", "MASCOT_REFERENCE_UNAVAILABLE");
      }
      const content = IntroOutroScriptContentSchema.parse(
        mergeGeneratedContent({
          raw: parsed,
          clipKind: params.clipKind,
          durationSeconds: params.durationSeconds,
          identity: params.identity,
        }),
      );
      const validationIssues = validateScriptContent(content, params.identity, params.seeds);
      if (!content.production_directions) throw new Error("Production directions, opening/closing states and final hold are required.");
      if (!params.context.logoReference && content.production_directions.logo_mode !== "none")
        throw new Error("No logo is supplied; logo_mode must be none.");
      if (
        params.companionContent &&
        (JSON.stringify(content.style) !== JSON.stringify(params.companionContent.style) ||
          content.production_directions.logo_placement !== params.companionContent.production_directions?.logo_placement ||
          content.production_directions.logo_mode !== params.companionContent.production_directions?.logo_mode)
      ) {
        throw new Error("Reuse the exact companion style and logo placement to preserve pair continuity.");
      }
      if (hasBlockingIssues(validationIssues)) {
        throw new IntroOutroScriptError(
          validationIssues
            .filter((issue) => issue.severity === "error")
            .map((issue) => issue.message)
            .join(" "),
          "SCRIPT_VALIDATION_FAILED",
        );
      }
      await params.onProgress?.(`Reviewing ${params.clipKind} production quality (${attempt}/3)`);
      let review: ScriptQualityReview;
      try {
        review = await reviewScriptQuality({ ...params, content, imageAttachments });
      } catch (reviewError) {
        params.signal.throwIfAborted();
        if (reviewError instanceof IntroOutroScriptError && reviewError.code === "MASCOT_REFERENCE_UNAVAILABLE") {
          throw reviewError;
        }
        const reviewIssue: IntroOutroValidationIssue = {
          code: "QUALITY_REVIEW_UNAVAILABLE",
          severity: "warning",
          path: "quality_review",
          message: "AI production review did not complete. Save a new revision to retry the review before approval.",
        };
        return buildRevision(params, content, [...validationIssues, reviewIssue]);
      }
      if (hasBlockingIssues(review.findings))
        throw new Error(
          review.findings
            .filter((finding) => finding.severity === "error")
            .map((finding) => `${finding.path}: ${finding.message}`)
            .join("\n"),
        );
      params.signal.throwIfAborted();
      return buildRevision(params, content, [...validationIssues, ...review.findings], review);
    } catch (error) {
      lastError = error;
      if (error instanceof IntroOutroScriptError && error.code === "MASCOT_REFERENCE_UNAVAILABLE") throw error;
    }
  }
  throw new IntroOutroScriptError(
    `Gemini Flash could not produce a valid ${params.clipKind} script: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    lastError instanceof IntroOutroScriptError ? lastError.code : "LLM_OUTPUT_INVALID",
    { cause: lastError },
  );
}

function buildRevision(
  params: Parameters<typeof generateIntroOutroScript>[0],
  content: ReturnType<typeof IntroOutroScriptContentSchema.parse>,
  validationIssues: ReturnType<typeof validateScriptContent>,
  qualityReview?: ScriptQualityReview,
): IntroOutroScriptRevision {
  const references = [
    {
      role: "mascot_subject" as const,
      asset_id: params.context.mascotReference.assetId,
      url: params.context.mascotReference.url,
      sha256: params.context.mascotReference.sha256,
      mime_type: params.context.mascotReference.mimeType,
    },
    ...(params.context.logoReference
      ? [
          {
            role: "channel_logo" as const,
            asset_id: params.context.logoReference.assetId,
            url: params.context.logoReference.url,
            sha256: params.context.logoReference.sha256,
            mime_type: params.context.logoReference.mimeType,
          },
        ]
      : []),
  ];
  return IntroOutroScriptRevisionSchema.parse({
    schema_version: 1,
    revision_id: makeId(`script_${params.clipKind}`),
    project_id: params.projectId,
    channel_id: params.context.channel.channel_id,
    style_preset_id: params.context.publicContext.style_preset_id,
    clip_kind: params.clipKind,
    revision_number: params.revisionNumber,
    origin: "generated",
    content,
    identity_snapshot: params.identity,
    ...(qualityReview ? { quality_review: qualityReview } : {}),
    seed_selection: params.seedSelection,
    seed_snapshot: params.seeds,
    references,
    context_fingerprint: fingerprint({
      identity: params.identity,
      references,
      seeds: params.seeds,
      duration: params.durationSeconds,
      template: INTRO_OUTRO_TEMPLATE_VERSION,
    }),
    template_version: INTRO_OUTRO_TEMPLATE_VERSION,
    requested_model: params.model,
    effective_model: null,
    validation_issues: validationIssues,
    warning_acknowledgements: [],
    created_at: nowIso(),
  });
}
