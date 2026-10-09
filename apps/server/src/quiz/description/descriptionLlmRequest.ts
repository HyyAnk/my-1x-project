import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { retryWithBackoff } from "../../utils/retryWithBackoff.js";
import type { QuizAnswerKey, SpoilerLeak } from "./description.types.js";
import { parseDescriptionJsonResponse } from "./descriptionResponseParser.js";
import { collectPublicDescriptionCopy, findSpoilerLeaks } from "./descriptionSpoilerGuard.js";

/** One initial draft plus one corrective rewrite before falling back to the template. */
const MAX_SPOILER_ATTEMPTS = 2;

export class DescriptionSpoilerError extends Error {
  constructor(readonly leaks: SpoilerLeak[]) {
    super(`DESCRIPTION_SPOILER: Draft revealed ${leaks.length} answer(s): ${leaks.map((leak) => `"${leak.answerText}"`).join(", ")}`);
    this.name = "DescriptionSpoilerError";
  }
}

export interface RequestDescriptionJsonInput {
  client: LLMClient;
  prompt: string;
  answerKeys: QuizAnswerKey[];
  modelOverride?: string;
  signal?: AbortSignal;
  timeoutMs: number;
}

export function buildSpoilerCorrectionPrompt(basePrompt: string, leaks: SpoilerLeak[]): string {
  const revealed = Array.from(new Set(leaks.map((leak) => `"${leak.answerText}"`))).join(", ");
  return [
    basePrompt,
    ``,
    `[CORRECTION REQUIRED]: Your previous draft revealed correct answers (${revealed}).`,
    `Rewrite every field so no correct answer is stated or implied. Tease the topics as open questions instead.`,
  ].join("\n");
}

/**
 * Requests the description JSON and rejects drafts that spoil answers,
 * asking the model for one corrective rewrite before giving up.
 */
export async function requestDescriptionJson(input: RequestDescriptionJsonInput): Promise<Record<string, unknown>> {
  let prompt = input.prompt;
  let leaks: SpoilerLeak[] = [];
  for (let attempt = 1; attempt <= MAX_SPOILER_ATTEMPTS; attempt++) {
    const rawOutput = await retryWithBackoff(
      () =>
        executeSinglePromptText(input.client, prompt, {
          modelOverride: input.modelOverride || "flash",
          signal: input.signal,
          timeoutMs: input.timeoutMs,
        }),
      { attempts: 3, baseDelayMs: 1500 },
    );
    const rawJson = parseDescriptionJsonResponse(rawOutput);
    leaks = findSpoilerLeaks(collectPublicDescriptionCopy(rawJson), input.answerKeys);
    if (leaks.length === 0) return rawJson;
    prompt = buildSpoilerCorrectionPrompt(input.prompt, leaks);
  }
  throw new DescriptionSpoilerError(leaks);
}
