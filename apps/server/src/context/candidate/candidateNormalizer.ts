import {
  makeId,
  nowIso,
  TopicCandidateSchema,
  TopicRunCandidateSchema,
  type EpisodeTopicCandidate,
  type ShortReelTopicCandidate,
  type TopicCandidate,
  type TopicProvenanceOrigin,
  type TopicRunCandidate,
} from "@studio/shared";
import type { TopicMatrixPlan, TopicMatrixSlotPlan } from "../topicMatrixPlanner.js";
import type { AllocatedSlot } from "../bankTopicAllocation.js";
import {
  ensureCandidateObject,
  extractCandidateTextFields,
  validateEpisodeCandidateSlot,
  validateShortReelCandidateSlot,
  type CandidateTextFields,
} from "./candidateFieldValidator.js";

/**
 * Builds a validated ShortReel TopicCandidate from slot plan and validated fields.
 */
export function buildShortReelSlotCandidate(
  item: Record<string, unknown>,
  slotPlan: TopicMatrixSlotPlan,
  textFields: CandidateTextFields,
  channelId: string,
  origin: TopicProvenanceOrigin,
  themeHint?: string,
): TopicCandidate {
  const topicId = typeof item.topic_id === "string" && item.topic_id.trim() ? item.topic_id.trim() : makeId("topic_reel");
  const domainId = typeof item.domain_id === "string" ? item.domain_id.trim() : slotPlan.domainId;
  const subtopicId = typeof item.subtopic_id === "string" ? item.subtopic_id.trim() : undefined;

  const candidate: ShortReelTopicCandidate = {
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "short_reel",
    title: textFields.title,
    premise: textFields.premise,
    why_it_fits: textFields.whyItFits,
    hook: textFields.hook,
    estimated_potential: textFields.estimatedPotential,
    generated_at: nowIso(),
    selected: false,
    origin,
    question_count: 1,
    aspect_ratio: "9:16",
    archetype: slotPlan.archetype as "versus_faceoff" | "deep_trivia",
    ...(themeHint ? { theme_hint: themeHint } : {}),
    ...(domainId ? { domain_id: domainId } : {}),
    ...(subtopicId ? { subtopic_id: subtopicId } : {}),
  };

  return TopicCandidateSchema.parse(candidate);
}

/**
 * Builds a validated Episode TopicCandidate from slot plan and validated fields.
 */
export function buildEpisodeSlotCandidate(
  item: Record<string, unknown>,
  slotPlan: TopicMatrixSlotPlan,
  textFields: CandidateTextFields,
  channelId: string,
  origin: TopicProvenanceOrigin,
  themeHint?: string,
  visualStyle: EpisodeTopicCandidate["visual_style"] = "mixed",
  ageBand: EpisodeTopicCandidate["age_band"] = "7-9",
): TopicCandidate {
  const topicId = typeof item.topic_id === "string" && item.topic_id.trim() ? item.topic_id.trim() : makeId("topic_ep");
  const domainId = typeof item.domain_id === "string" ? item.domain_id.trim() : slotPlan.domainId;
  const subtopicId = typeof item.subtopic_id === "string" ? item.subtopic_id.trim() : undefined;

  const candidate: EpisodeTopicCandidate = {
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "episode",
    title: textFields.title,
    premise: textFields.premise,
    why_it_fits: textFields.whyItFits,
    hook: textFields.hook,
    estimated_potential: textFields.estimatedPotential,
    generated_at: nowIso(),
    selected: false,
    origin,
    quiz_format: slotPlan.quizFormat,
    archetype: slotPlan.archetype,
    suggested_layout: slotPlan.suggestedLayout,
    question_count: 8,
    visual_style: visualStyle,
    age_band: ageBand,
    ...(themeHint ? { theme_hint: themeHint } : {}),
    ...(domainId ? { domain_id: domainId } : {}),
    ...(subtopicId ? { subtopic_id: subtopicId } : {}),
  };

  return TopicCandidateSchema.parse(candidate);
}

/**
 * Validates and constructs a single candidate slot for a TopicMatrixPlan.
 */
export function buildCandidateFromSlot(
  raw: unknown,
  slotPlan: TopicMatrixSlotPlan,
  slotIndex: number,
  channelId: string,
  plan: TopicMatrixPlan,
): TopicCandidate {
  const slotNumber = slotIndex + 1;
  const item = ensureCandidateObject(raw, slotNumber);

  const hasKeyword = Boolean(plan.steeredKeyword && plan.steeredKeyword.trim());
  const isSteered = hasKeyword && (slotIndex === 0 || slotIndex === 3);
  const origin: TopicProvenanceOrigin = isSteered ? "keyword" : "discovery";
  const themeHint = isSteered ? plan.steeredKeyword : undefined;

  if (slotPlan.contentKind === "short_reel") {
    const textFields = validateShortReelCandidateSlot(item, slotPlan, slotNumber);
    return buildShortReelSlotCandidate(item, slotPlan, textFields, channelId, origin, themeHint);
  }

  const { visualStyle, ageBand, ...textFields } = validateEpisodeCandidateSlot(item, slotPlan, slotNumber);
  return buildEpisodeSlotCandidate(item, slotPlan, textFields, channelId, origin, themeHint, visualStyle, ageBand);
}

/**
 * Builds a ShortReel TopicRunCandidate for an allocated slot.
 */
export function buildShortReelRunCandidate(
  slot: AllocatedSlot,
  item: Record<string, unknown>,
  channelId: string,
): TopicRunCandidate {
  const textFields = extractCandidateTextFields(item, slot.slot);
  const topicId = makeId("topic_reel");
  const origin: TopicProvenanceOrigin = slot.isKeySteered ? "keyword" : "discovery";
  const themeHint = slot.isKeySteered ? slot.domainTitle : undefined;

  const shortReelCandidate: ShortReelTopicCandidate = {
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "short_reel",
    title: textFields.title,
    premise: textFields.premise,
    why_it_fits: textFields.whyItFits,
    hook: textFields.hook,
    estimated_potential: textFields.estimatedPotential,
    generated_at: nowIso(),
    selected: false,
    origin,
    question_count: 1,
    aspect_ratio: "9:16",
    archetype: slot.archetype as "versus_faceoff" | "deep_trivia",
    ...(themeHint ? { theme_hint: themeHint } : {}),
    domain_id: slot.domainId,
    ...(slot.subtopicId ? { subtopic_id: slot.subtopicId } : {}),
  };

  return TopicRunCandidateSchema.parse({
    ...TopicCandidateSchema.parse(shortReelCandidate),
    slot_id: slot.slotId,
    source_bindings: slot.sourceBindings,
  });
}

/**
 * Builds an Episode TopicRunCandidate for an allocated slot.
 */
export function buildEpisodeRunCandidate(
  slot: AllocatedSlot,
  item: Record<string, unknown>,
  channelId: string,
): TopicRunCandidate {
  const textFields = extractCandidateTextFields(item, slot.slot);
  const topicId = makeId("topic_ep");
  const origin: TopicProvenanceOrigin = slot.isKeySteered ? "keyword" : "discovery";
  const themeHint = slot.isKeySteered ? slot.domainTitle : undefined;
  const visualStyle =
    typeof item.visual_style === "string"
      ? (item.visual_style as EpisodeTopicCandidate["visual_style"])
      : "mixed";
  const ageBand =
    typeof item.age_band === "string"
      ? (item.age_band as EpisodeTopicCandidate["age_band"])
      : "7-9";

  const episodeCandidate: EpisodeTopicCandidate = {
    topic_id: topicId,
    channel_id: channelId,
    content_kind: "episode",
    title: textFields.title,
    premise: textFields.premise,
    why_it_fits: textFields.whyItFits,
    hook: textFields.hook,
    estimated_potential: textFields.estimatedPotential,
    generated_at: nowIso(),
    selected: false,
    origin,
    quiz_format: slot.quizFormat,
    archetype: slot.archetype,
    suggested_layout: slot.suggestedLayout,
    question_count: slot.questionCount,
    visual_style: visualStyle,
    age_band: ageBand,
    ...(themeHint ? { theme_hint: themeHint } : {}),
    domain_id: slot.domainId,
    ...(slot.subtopicId ? { subtopic_id: slot.subtopicId } : {}),
  };

  return TopicRunCandidateSchema.parse({
    ...TopicCandidateSchema.parse(episodeCandidate),
    slot_id: slot.slotId,
    source_bindings: slot.sourceBindings,
  });
}

/**
 * Builds and normalizes a candidate from an allocated slot and raw match.
 */
export function buildCandidateFromItem(
  slot: AllocatedSlot,
  rawMatch: unknown,
  channelId: string,
): TopicRunCandidate {
  const item = rawMatch as Record<string, unknown>;
  if (slot.contentKind === "short_reel") {
    return buildShortReelRunCandidate(slot, item, channelId);
  }
  return buildEpisodeRunCandidate(slot, item, channelId);
}

/**
 * Backward compatibility alias for buildCandidateFromItem.
 */
export const buildAllocatedRunCandidate = buildCandidateFromItem;
