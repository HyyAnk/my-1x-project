import { QUIZ_SHORT_DEFAULT_QUESTION_COUNT } from "@studio/shared";
import type { TopicMatrixPlan, TopicMatrixSlotPlan } from "./topicMatrix.types.js";

export interface TopicMatrixPromptSections {
  hintGuidance: string;
  blueprintGuidance: string;
  outputContract: string;
}

const KIND_LABELS: Record<TopicMatrixSlotPlan["contentKind"], string> = {
  episode: "Episode",
  quiz_short: "Quiz-Short",
  short_reel: "Short-Reel",
};

export const QUIZ_SHORT_PROMPT_CONTRACT = `Quiz-Short concepts are portrait 9:16 videos of ${QUIZ_SHORT_DEFAULT_QUESTION_COUNT} short questions drawn from ONE topic. Question text is at most 90 characters, every choice is at most 32 characters, the ${QUIZ_SHORT_DEFAULT_QUESTION_COUNT} questions form one escalating difficulty arc from easy to hard, and there is no intro: the first question opens the video.`;

function describeSlotExtras(slot: TopicMatrixSlotPlan): string {
  if (slot.contentKind === "short_reel") return `, question_count: 1, aspect_ratio: "9:16"`;
  if (slot.contentKind === "quiz_short") {
    return `, question_count: ${QUIZ_SHORT_DEFAULT_QUESTION_COUNT}, aspect_ratio: "9:16", suggested_layout: "${slot.suggestedLayout}"`;
  }
  return `, quiz_format: "${slot.quizFormat}", suggested_layout: "${slot.suggestedLayout}"`;
}

function formatBlueprintLine(slot: TopicMatrixSlotPlan): string {
  return `- Slot ${slot.slot} (${KIND_LABELS[slot.contentKind]} - ${slot.name}): ${slot.description} (domain_id: "${slot.domainId}", content_kind: "${slot.contentKind}", archetype: "${slot.archetype}"${describeSlotExtras(slot)}).`;
}

function describeSteeredSlot(slot: TopicMatrixSlotPlan): string {
  return `Slot ${slot.slot} (${KIND_LABELS[slot.contentKind]}) is steered to domain "${slot.domainId}" (${slot.domainTitle})`;
}

function formatHintGuidance(plan: TopicMatrixPlan, trimmedHint: string): string {
  const steeredSlots = plan.slots.filter((slot) => slot.isKeySteered);
  const otherDomains = plan.slots.filter((slot) => !slot.isKeySteered).map((slot) => `"${slot.domainId}"`);
  return `\nIMPORTANT TOPIC THEME REQUIREMENT: The user specifically requested ideas relating to "${trimmedHint}". Exactly ${steeredSlots.length} candidates MUST be directly inspired by, focused on, or explore specific creative angles of "${trimmedHint}" (include "theme_hint": "${trimmedHint}" in those ${steeredSlots.length} JSON objects). ${steeredSlots.map(describeSteeredSlot).join(" and ")}. The remaining candidates should be diverse, creative discovery topics aligned with the overall channel DNA (sourced from domains: ${otherDomains.join(", ")}), and MUST NOT reuse the keyword.`;
}

function formatSlotRange(slots: TopicMatrixSlotPlan[]): string {
  if (slots.length === 0) return "none";
  const first = slots[0].slot;
  const last = slots[slots.length - 1].slot;
  return first === last ? `Slot ${first}` : `Slots ${first}-${last}`;
}

function formatOutputContract(plan: TopicMatrixPlan, blueprintGuidance: string, hintGuidance: string): string {
  const episodes = plan.slots.filter((slot) => slot.contentKind === "episode");
  const quizShorts = plan.slots.filter((slot) => slot.contentKind === "quiz_short");
  const shortReels = plan.slots.filter((slot) => slot.contentKind === "short_reel");
  const groups = [
    `${formatSlotRange(episodes)} are Episode concepts (content_kind: "episode", 3-10 questions, landscape layout)`,
    `${formatSlotRange(quizShorts)} are Quiz-Short concepts (content_kind: "quiz_short", question_count: ${QUIZ_SHORT_DEFAULT_QUESTION_COUNT}, 9:16 vertical)`,
    `${formatSlotRange(shortReels)} are Short-Reel concepts (content_kind: "short_reel", question_count: 1, 9:16 vertical)`,
  ];
  return `Return exactly ${plan.slots.length} JSON candidates: ${groups.join(", ")}. ${QUIZ_SHORT_PROMPT_CONTRACT} Each candidate must have title, premise, why_it_fits, hook, estimated_potential, domain_id, and content_kind.${blueprintGuidance}${hintGuidance} Do not research or develop them further.`;
}

export function formatTopicMatrixPrompt(plan: TopicMatrixPlan, topicHint?: string, aspectRatio?: "16:9"): TopicMatrixPromptSections {
  void aspectRatio;
  const trimmedHint = topicHint?.trim();
  const hintGuidance = trimmedHint ? formatHintGuidance(plan, trimmedHint) : "";
  const blueprintGuidance = `\nGAMEPLAY ARCHETYPE BLUEPRINTS FOR DIVERSITY:\n${plan.slots.map(formatBlueprintLine).join("\n")}`;
  const outputContract = formatOutputContract(plan, blueprintGuidance, hintGuidance);
  return { hintGuidance, blueprintGuidance, outputContract };
}
