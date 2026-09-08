import { RepositoryError } from "../repository/errors.js";
import type { TopicAllocationResult } from "./bankTopicAllocation.js";

export const MAX_SOURCE_CONTEXT_CHARS = 60_000;

export interface SourceBackedTopicPrompt {
  promptGuidance: string;
  outputContract: string;
  sourceContextText: string;
}

export function formatSourceBackedTopicPrompt(allocation: TopicAllocationResult, topicHint?: string): SourceBackedTopicPrompt {
  const { allocatedSlots } = allocation;
  const trimmedHint = topicHint?.trim();

  const slotDescriptions = allocatedSlots.map((slot) => {
    const questionSummaries = slot.allocatedQuestions.map((q, idx) => {
      const choicesStr = q.choices.map((c) => `[${c.id}] ${c.text}`).join(" | ");
      return `    Q${idx + 1} (${q.question.id}): "${q.sourceText}" | Choices: ${choicesStr} | Correct: [${q.correctChoiceId}] "${q.selectedAnswerText}" | Explanation: ${q.explanation}`;
    });

    return `Slot ${slot.slot} (${slot.slotId}): ${slot.name}
  Content Kind: ${slot.contentKind}
  Archetype: ${slot.archetype}
  Quiz Format: ${slot.quizFormat}
  Domain: ${slot.domainId} (${slot.domainTitle})${slot.subtopicId ? ` / Subtopic: ${slot.subtopicId}` : ""}
  Steered by Keyword: ${slot.isKeySteered ? "YES" : "NO"}
  Allocated Source Questions (${slot.questionCount}):
${questionSummaries.join("\n")}`;
  });

  const sourceContextText = `PRE-ALLOCATED CANONICAL SOURCE QUESTIONS:
${slotDescriptions.join("\n\n")}`;

  if (sourceContextText.length > MAX_SOURCE_CONTEXT_CHARS) {
    throw new RepositoryError(
      `OVERSIZED_CONTEXT: Source context length (${sourceContextText.length} chars) exceeds maximum allowable limit (${MAX_SOURCE_CONTEXT_CHARS} chars). Truncation is forbidden to protect data integrity.`,
      "OVERSIZED_CONTEXT",
    );
  }

  let hintGuidance = "";
  if (trimmedHint) {
    hintGuidance = `\nKEYWORD THEME GUIDANCE: The user requested topics relating to "${trimmedHint}". Slots marked as steered MUST weave this theme creatively into their title, premise, and hook, staying faithful to their pre-allocated questions.`;
  }

  const outputContract = `CRITICAL CONTRACT: You are proposing creative presentation concepts for the EXACT pre-allocated questions shown above.
For each allocated slot (${allocatedSlots.map((s) => s.slotId).join(", ")}), return a JSON object with ONLY the following creative fields:
- slot_id: string (must match the assigned slot_id, e.g. "${allocatedSlots[0]?.slotId ?? "slot_1"}")
- title: string (catchy, engaging episode or short-reel title)
- premise: string (brief 1-2 sentence overview of the quiz narrative or hook)
- why_it_fits: string (why this fits the channel DNA and audience)
- hook: string (irresistible opening hook line)
- estimated_potential: string (why this topic will perform well)

DO NOT alter, replace, or return source questions, source bindings, content_kind, archetype, or domain_id. The server retains sole authority over all questions and bindings.
Return a JSON array containing exactly ${allocatedSlots.length} candidates, one for each allocated slot.${hintGuidance}`;

  return {
    promptGuidance: sourceContextText,
    outputContract,
    sourceContextText,
  };
}
