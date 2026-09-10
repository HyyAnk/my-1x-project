import type { GeneratedReelPublishing, ShortReelRecord } from "@studio/shared";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { requestScriptText, ScriptGenerationError } from "./scriptProvider.js";
import { requireCompleteShortReelSource } from "../repository/shortReelSourcePolicy.js";
import type { ProductLocalizationArtifact } from "../quiz/bank/localization/productLocalization.js";
import { buildPublishingPrompt } from "./publishingPrompt.js";
import { parsePublishingJson } from "./publishingParser.js";

export { buildPublishingPrompt } from "./publishingPrompt.js";
export { parsePublishingJson } from "./publishingParser.js";

export interface PublishingGenerationOptions {
  llmClient?: LLMClient;
  signal?: AbortSignal;
  timeoutMs?: number;
  localization?: ProductLocalizationArtifact | null;
  allowBaselineFallback?: boolean;
}

/**
 * Generates concise two-field publishing copy (title <= 80, description <= 600)
 * grounded in the accepted 3-segment script and source facts.
 *
 * Enforces:
 * - Real LLM generation without silent production fallback
 * - At most one bounded correction attempt for malformed/over-length JSON
 * - Preserves generated English copy without post-generation localization overwrite
 */
export async function generateReelPublishing(
  record: ShortReelRecord,
  options?: PublishingGenerationOptions,
): Promise<GeneratedReelPublishing> {
  requireCompleteShortReelSource(record.source);
  if (options?.signal?.aborted) {
    throw new ScriptGenerationError("ABORTED", "Publishing generation was cancelled.");
  }

  if (!options?.llmClient) {
    if (options?.allowBaselineFallback) {
      return {
        title: record.topic.title.slice(0, 80),
        description: `${record.topic.premise}\n\n#Shorts #Quiz #Trivia`.slice(0, 600),
      };
    }
    throw new ScriptGenerationError("PROVIDER_ERROR", "A configured LLM client is required to generate publishing.");
  }

  const prompt = buildPublishingPrompt(record);
  const timeout = options.timeoutMs ?? 60_000;
  const rawText = await requestScriptText(options.llmClient, prompt, options.signal, timeout);

  const parsed = parsePublishingJson(rawText);
  if (parsed) {
    return parsed;
  }

  // At most one correction attempt within the deadline
  const correctionPrompt = [
    "Your previous response was not valid JSON or exceeded character limits.",
    "Respond ONLY with a strictly valid JSON object containing exactly 'title' and 'description':",
    '{"title": "<concise title, max 80 characters>", "description": "<engaging summary ending with hashtags, max 600 characters>"}',
  ].join("\n");

  const correctionText = await requestScriptText(options.llmClient, correctionPrompt, options.signal, timeout);
  const corrected = parsePublishingJson(correctionText);
  if (corrected) {
    return corrected;
  }

  throw new ScriptGenerationError("VALIDATION_FAILED", "Publishing response failed validation or exceeded character limits.");
}
