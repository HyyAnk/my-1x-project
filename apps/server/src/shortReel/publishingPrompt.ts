import type { ShortReelRecord } from "@studio/shared";

export const PUBLISHING_PROMPT_VERSION = "v1";

function sanitizeUntrusted(text: string | undefined | null): string {
  if (!text) return "";
  return JSON.stringify(text).slice(1, -1).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

/**
 * Pure function that compiles the publishing copy generation prompt for LLM.
 *
 * Enforces:
 * - Exactly two fields: "title" (<=80 chars) and "description" (<=600 chars including hashtags)
 * - Grounding on all 3 accepted script segments and source facts
 * - Concise curiosity hook in title without revealing the correct quiz answer
 * - 3 to 5 relevant hashtags at the end of the description
 * - Delimited narrative context to prevent prompt injection
 */
export function buildPublishingPrompt(record: ShortReelRecord): string {
  const script = record.script;
  const source = record.source;
  const topic = record.topic;

  const segmentNarratives = script
    ? script.segments
        .map(
          (seg) =>
            `Segment ${seg.index} (${seg.mode}, ${seg.duration_seconds}s):\n` +
            `Narrative: ${sanitizeUntrusted(seg.narrative)}\n` +
            `Cues: ${seg.text_cues.map((c) => `[${c.role}] "${sanitizeUntrusted(c.text)}"`).join(", ") || "None"}`,
        )
        .join("\n\n")
    : `Topic Premise: ${sanitizeUntrusted(topic.premise)}`;

  const sanitizedTopicTitle = sanitizeUntrusted(topic.title);
  const sanitizedTopicHook = sanitizeUntrusted(topic.hook);
  const sanitizedTopicPremise = sanitizeUntrusted(topic.premise);
  const sanitizedQuestion = sanitizeUntrusted(source.question_text);
  const sanitizedExplanation = sanitizeUntrusted(source.explanation);
  const sanitizedAnswer = sanitizeUntrusted(source.selected_answer_text);

  return [
    "You are an expert social media copywriter specializing in high-CTR, viral YouTube Shorts and TikTok video publishing.",
    "",
    "TASK:",
    "Write concise, engaging English publishing copy for the micro-story defined below.",
    "",
    "OUTPUT REQUIREMENTS:",
    "You MUST respond ONLY with a strictly valid JSON object containing exactly two keys: 'title' and 'description'.",
    "{",
    '  "title": "Compelling curiosity-hook title (maximum 80 characters)",',
    '  "description": "Engaging description with story context (1-3 short sentences), ending with 3-5 relevant hashtags (maximum 600 characters total)"',
    "}",
    "",
    "CRITICAL CONSTRAINTS:",
    "- 'title' MUST be at most 80 characters in length. Punchy, high-interest, no filler words.",
    "- 'description' MUST be at most 600 characters in length, INCLUDING the hashtags at the end.",
    "- Hashtags MUST be placed at the end of the description (e.g., '#Shorts #Quiz #Trivia').",
    "- DO NOT reveal the canonical answer in the title. Create intrigue so viewers watch the full short.",
    "- Canonical answer is provided solely as factual context for the story; do not spoil the reveal.",
    "- Output ONLY the JSON object. Do not include introductory text, markdown commentary, or extra keys.",
    "- Language: English only.",
    "",
    "FACTUAL SOURCE CONTEXT:",
    "<source_context>",
    `Topic: ${sanitizedTopicTitle}`,
    `Hook: ${sanitizedTopicHook}`,
    `Premise: ${sanitizedTopicPremise}`,
    `Question: "${sanitizedQuestion}"`,
    `Explanation: ${sanitizedExplanation}`,
    `Canonical Answer: "${sanitizedAnswer}"`,
    "</source_context>",
    "",
    "ACCEPTED SCRIPT SEGMENTS (All 3 segments must be reflected in the story context):",
    "<script_segments>",
    segmentNarratives,
    "</script_segments>",
  ].join("\n");
}
