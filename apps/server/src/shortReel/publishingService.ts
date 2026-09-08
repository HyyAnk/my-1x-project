import { ReelPublishingPayloadSchema, type ReelPublishingPayload, type ShortReelRecord } from "@studio/shared";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { requestScriptText, ScriptGenerationError } from "./scriptProvider.js";
import { requireCompleteShortReelSource } from "../repository/shortReelSourcePolicy.js";

export interface PublishingGenerationOptions {
  llmClient?: LLMClient;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function buildPublishingPrompt(record: ShortReelRecord): string {
  return [
    "You are an expert social media copywriter for YouTube Shorts and TikTok.",
    "Write concise, engaging English publishing copy for the following video:",
    `Title: ${record.topic.title}`,
    `Topic Hook: ${record.topic.hook}`,
    `Topic Premise: ${record.topic.premise}`,
    `Question: "${record.source.question_text}"`,
    `Explanation: ${JSON.stringify(record.source.explanation)}`,
    `Canonical Answer: ${JSON.stringify(record.source.selected_answer_text)}`,
    "",
    "Format your response as a strictly valid JSON object with the following schema:",
    "{",
    '  "hook": "An attention-grabbing 1-2 sentence hook question (max 500 chars)",',
    '  "description": "A concise story explanation and context (max 2000 chars)",',
    '  "cta": "Engaging call to action like \'Comment your answer below!\' (max 200 chars)",',
    '  "hashtags": ["#Tag1", "#Tag2", "#Tag3"]',
    "}",
    "Notes:",
    "- All hashtags are suggestions, not verified trends.",
    "- Do not make policy or viral guarantees.",
    "- English only.",
  ].join("\n");
}

function normalizePublishingCandidate(obj: unknown): unknown {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const raw = obj as Record<string, unknown>;

  let rawTags: string[] = [];
  if (Array.isArray(raw.hashtags)) {
    if (!raw.hashtags.every((h) => typeof h === "string")) return null;
    rawTags = raw.hashtags.map((h: string) => h.trim()).filter(Boolean);
  } else if (typeof raw.hashtags === "string") {
    rawTags = raw.hashtags
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean);
  }

  const normalizedHashtags = rawTags.map((h) => (h.startsWith("#") ? h : `#${h}`));

  return {
    hook: typeof raw.hook === "string" ? raw.hook.trim() : "",
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    cta: typeof raw.cta === "string" ? raw.cta.trim() : null,
    hashtags: normalizedHashtags,
  };
}

export function parsePublishingJson(raw: string): ReelPublishingPayload | null {
  const trimmed = raw.trim();
  const blocks = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)].map((m) => m[1]);
  const candidates = [trimmed, ...blocks.reverse(), trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)];

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const normalized = normalizePublishingCandidate(parsed);
      const validated = ReelPublishingPayloadSchema.safeParse(normalized);
      if (validated.success) return validated.data;
    } catch {
      // Try next
    }
  }
  return null;
}

/**
 * Builds deterministic fallback publishing copy when LLM is unavailable or unparseable.
 */
function buildFallbackPublishing(record: ShortReelRecord): ReelPublishingPayload {
  const archetypeTag = record.source.archetype_id === "versus_faceoff" ? "#Versus" : "#DeepTrivia";
  const hook = record.topic.hook || record.source.question_text;
  const description = `${record.topic.title}: ${record.topic.premise}\n\n${record.source.explanation}`.trim();
  const cta = "Comment your answer below!";
  const hashtags = ["#Shorts", "#Trivia", "#Quiz", archetypeTag];

  return ReelPublishingPayloadSchema.parse({
    hook: hook.slice(0, 500),
    description: description.slice(0, 2000),
    cta,
    hashtags,
  });
}

/**
 * Generates concise publishing copy from the source question and story premise.
 */
export async function generateReelPublishing(
  record: ShortReelRecord,
  options?: PublishingGenerationOptions,
): Promise<ReelPublishingPayload> {
  requireCompleteShortReelSource(record.source);
  if (options?.signal?.aborted) throw new ScriptGenerationError("ABORTED", "Publishing generation was cancelled.");
  if (options?.llmClient) {
    const prompt = buildPublishingPrompt(record);
    const text = await requestScriptText(options.llmClient, prompt, options.signal, options.timeoutMs ?? 15_000);
    const parsed = parsePublishingJson(text);
    if (parsed) return parsed;
    throw new ScriptGenerationError("VALIDATION_FAILED", "Publishing response is invalid. Retry generation.");
  }

  return buildFallbackPublishing(record);
}
