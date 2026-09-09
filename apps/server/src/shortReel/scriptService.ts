import { CompleteShortReelSourceSnapshotSchema, ReelScriptSchema, validateReelScript, type ReelScript } from "@studio/shared";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { buildScriptCorrectionPrompt, buildScriptGenerationPrompt, type ScriptPromptContext } from "./scriptPrompt.js";
import { requestScriptText, ScriptGenerationError } from "./scriptProvider.js";

export { ScriptGenerationError, type ScriptGenerationErrorCode } from "./scriptProvider.js";

export interface GenerateReelScriptOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxCorrectionAttempts?: number;
}

function extractScriptJson(rawOutput: string): unknown {
  const trimmed = rawOutput.trim();
  const blocks = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)].map((match) => match[1]);
  const candidates = [trimmed, ...blocks.reverse(), trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* Try the next supported response envelope. */
    }
  }
  throw new ScriptGenerationError("PARSE_ERROR", "Script response did not contain valid JSON.");
}

function parseScript(raw: string, context: ScriptPromptContext): ReelScript {
  const parsed = ReelScriptSchema.safeParse(extractScriptJson(raw));
  if (!parsed.success)
    throw new ScriptGenerationError(
      "VALIDATION_FAILED",
      "Script structure is invalid.",
      parsed.error.issues.map((issue) => issue.path.join(".")),
    );
  const validation = validateReelScript(parsed.data, context.source, [], context.displayProjection);
  const questionInFirst = parsed.data.segments[0].text_cues.some((cue) => cue.role === "question");
  const earlyAnswer = parsed.data.segments.slice(0, 2).some((segment) => segment.text_cues.some((cue) => cue.role === "answer"));
  if (!validation.valid || !questionInFirst || earlyAnswer) {
    throw new ScriptGenerationError("VALIDATION_FAILED", "Script source or reveal timing is invalid.", [
      ...validation.errors,
      ...(!questionInFirst || earlyAnswer ? ["Place the question in segment 1 and the answer only in segment 3."] : []),
    ]);
  }
  return parsed.data;
}

/** One initial request and at most one shared parse/schema correction, with a whole-operation deadline. */
export async function generateReelScript(
  context: ScriptPromptContext,
  llmClient: LLMClient,
  options: GenerateReelScriptOptions = {},
): Promise<ReelScript> {
  if (!CompleteShortReelSourceSnapshotSchema.safeParse(context.source).success) {
    throw new ScriptGenerationError("VALIDATION_FAILED", "A complete validated source is required.");
  }
  const frozenContext = structuredClone(context);
  const configuredTimeout = options.timeoutMs ?? 60_000;
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? Math.min(configuredTimeout, 60_000) : 60_000;
  const deadline = Date.now() + timeoutMs;
  const initialPrompt = buildScriptGenerationPrompt(frozenContext);
  let prompt = initialPrompt;
  const corrections = (options.maxCorrectionAttempts ?? 1) > 0 ? 1 : 0;
  for (let attempt = 0; attempt <= corrections; attempt++) {
    if (options.signal?.aborted) throw new ScriptGenerationError("ABORTED", "Script generation was aborted.");
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new ScriptGenerationError("TIMEOUT", "Script generation timed out. Retry generation.");
    const raw = await requestScriptText(llmClient, prompt, options.signal, remaining);
    try {
      return parseScript(raw, frozenContext);
    } catch (error) {
      if (!(error instanceof ScriptGenerationError) || attempt === corrections) throw error;
      prompt = buildScriptCorrectionPrompt(initialPrompt, raw, error.validationErrors ?? [error.message]);
    }
  }
  throw new ScriptGenerationError("VALIDATION_FAILED", "Script generation failed.");
}
