import { executeSinglePromptText, type LLMClient } from "../../utils/promptSanitizer.js";
import { retryWithBackoff } from "../../utils/retryWithBackoff.js";
import { parseDescriptionJsonResponse } from "../description/descriptionResponseParser.js";
import { buildTitleCorrectionPrompt } from "./titlePromptCompiler.js";
import { hasBlockingIssue, reviewTitleDraft, sanitizeVideoTitle } from "./titleValidator.js";
import type { TitleDraft, TitleIssue, TitleReviewContext } from "./videoTitle.types.js";

/** One initial draft plus one corrective rewrite before falling back to the template. */
const MAX_TITLE_ATTEMPTS = 2;

export class VideoTitleRejectedError extends Error {
  constructor(readonly issues: TitleIssue[]) {
    super(`VIDEO_TITLE_REJECTED: ${issues.map((issue) => `${issue.code} (${issue.detail})`).join("; ")}`);
    this.name = "VideoTitleRejectedError";
  }
}

export interface RequestVideoTitleInput {
  client: LLMClient;
  prompt: string;
  review: TitleReviewContext;
  /** Product-specific normalization applied after parsing, e.g. the Quiz Short " #Shorts" suffix. */
  finalizeDraft?: (draft: TitleDraft) => TitleDraft;
  modelOverride?: string;
  signal?: AbortSignal;
  timeoutMs: number;
}

/** Parses the raw LLM output into a sanitized draft, or null when it is not usable JSON. */
export function parseTitleDraft(rawText: string): TitleDraft | null {
  let rawJson: Record<string, unknown>;
  try {
    rawJson = parseDescriptionJsonResponse(rawText);
  } catch {
    return null;
  }
  if (typeof rawJson.title !== "string") return null;
  const title = sanitizeVideoTitle(rawJson.title);
  const primaryKeyword = typeof rawJson.primary_keyword === "string" ? rawJson.primary_keyword.trim() : "";
  return { title, primaryKeyword: primaryKeyword || title };
}

const UNPARSEABLE_ISSUE: TitleIssue = { code: "EMPTY", severity: "blocker", detail: "Response was not a JSON object with a title." };

/**
 * Requests a title and reviews it deterministically. Failed checks trigger one
 * corrective rewrite; advisory issues left after that rewrite are tolerated.
 */
export async function requestVideoTitle(input: RequestVideoTitleInput): Promise<TitleDraft> {
  let prompt = input.prompt;
  let issues: TitleIssue[] = [];
  for (let attempt = 1; attempt <= MAX_TITLE_ATTEMPTS; attempt++) {
    const rawOutput = await retryWithBackoff(
      () =>
        executeSinglePromptText(input.client, prompt, {
          modelOverride: input.modelOverride || "flash",
          signal: input.signal,
          timeoutMs: input.timeoutMs,
        }),
      { attempts: 3, baseDelayMs: 1500 },
    );
    const parsed = parseTitleDraft(rawOutput);
    const draft = parsed && input.finalizeDraft ? input.finalizeDraft(parsed) : parsed;
    issues = draft ? reviewTitleDraft(draft, input.review) : [UNPARSEABLE_ISSUE];
    if (draft && issues.length === 0) return draft;
    if (draft && attempt === MAX_TITLE_ATTEMPTS && !hasBlockingIssue(issues)) return draft;
    prompt = buildTitleCorrectionPrompt(input.prompt, issues);
  }
  throw new VideoTitleRejectedError(issues);
}
