import type { EpisodeTopicCandidate } from "@studio/shared";
import type { TopicMatrixSlotPlan } from "../topicMatrixPlanner.js";
import type { AllocatedSlot } from "../bankTopicAllocation.js";

export interface CandidateTextFields {
  title: string;
  premise: string;
  whyItFits: string;
  hook: string;
  estimatedPotential: string;
}

export interface ValidatedEpisodeSlotFields extends CandidateTextFields {
  visualStyle: EpisodeTopicCandidate["visual_style"];
  ageBand: EpisodeTopicCandidate["age_band"];
}

/**
 * Ensures a raw candidate value is a valid non-null, non-array object.
 */
export function ensureCandidateObject(raw: unknown, slotNumber: number | string): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`Slot ${slotNumber} candidate is not a valid JSON object`);
  }
  return raw as Record<string, unknown>;
}

/**
 * Extracts and validates required text fields from a candidate item.
 */
export function extractCandidateTextFields(item: Record<string, unknown>, slotNumber: number | string): CandidateTextFields {
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const premise = typeof item.premise === "string" ? item.premise.trim() : "";
  const whyItFits = typeof (item.why_it_fits ?? item.whyItFits) === "string" ? String(item.why_it_fits ?? item.whyItFits).trim() : "";
  const hook = typeof item.hook === "string" ? item.hook.trim() : "";
  const estimatedPotential =
    typeof (item.estimated_potential ?? item.estimatedPotential) === "string"
      ? String(item.estimated_potential ?? item.estimatedPotential).trim()
      : "";

  if (!title || !premise || !whyItFits || !hook || !estimatedPotential) {
    throw new Error(
      `Slot ${slotNumber} candidate has empty or missing required text fields (title, premise, why_it_fits, hook, estimated_potential)`,
    );
  }

  return { title, premise, whyItFits, hook, estimatedPotential };
}

/**
 * Validates that candidate metadata conforms strictly to the slot plan.
 */
export function checkSlotKindAndArchetype(item: Record<string, unknown>, slotPlan: TopicMatrixSlotPlan, slotNumber: number): void {
  const rawKind = typeof (item.content_kind ?? item.contentKind) === "string" ? String(item.content_kind ?? item.contentKind) : undefined;
  if (!rawKind) throw new Error(`Slot ${slotNumber} candidate is missing required content_kind`);
  if (rawKind !== slotPlan.contentKind) {
    throw new Error(`Slot ${slotNumber} candidate has content_kind "${rawKind}", expected assigned "${slotPlan.contentKind}"`);
  }

  const rawArchetype =
    typeof (item.archetype ?? item.archetype_id ?? item.archetypeId) === "string"
      ? String(item.archetype ?? item.archetype_id ?? item.archetypeId)
      : undefined;
  if (!rawArchetype) throw new Error(`Slot ${slotNumber} candidate is missing required archetype`);
  if (rawArchetype !== slotPlan.archetype) {
    const kindLabel = slotPlan.contentKind === "short_reel" ? "Short-Reel" : "Episode";
    throw new Error(`Slot ${slotNumber} ${kindLabel} candidate has archetype "${rawArchetype}", expected assigned "${slotPlan.archetype}"`);
  }
  const rawDomain = typeof item.domain_id === "string" ? item.domain_id.trim() : "";
  if (!rawDomain) throw new Error(`Slot ${slotNumber} candidate is missing required domain_id`);
  if (rawDomain !== slotPlan.domainId) {
    throw new Error(`Slot ${slotNumber} candidate has domain_id "${rawDomain}", expected assigned "${slotPlan.domainId}"`);
  }
}

/**
 * Validates an episode candidate slot against its plan and extracts validated fields.
 */
export function validateEpisodeCandidateSlot(
  item: Record<string, unknown>,
  slotPlan: TopicMatrixSlotPlan,
  slotNumber: number,
): ValidatedEpisodeSlotFields {
  checkSlotKindAndArchetype(item, slotPlan, slotNumber);
  const textFields = extractCandidateTextFields(item, slotNumber);
  const visualStyle = typeof item.visual_style === "string" ? (item.visual_style as EpisodeTopicCandidate["visual_style"]) : "mixed";
  const ageBand = typeof item.age_band === "string" ? (item.age_band as EpisodeTopicCandidate["age_band"]) : "7-9";

  return { ...textFields, visualStyle, ageBand };
}

/**
 * Validates a short-reel candidate slot against its plan and extracts validated text fields.
 */
export function validateShortReelCandidateSlot(
  item: Record<string, unknown>,
  slotPlan: TopicMatrixSlotPlan,
  slotNumber: number,
): CandidateTextFields {
  checkSlotKindAndArchetype(item, slotPlan, slotNumber);
  return extractCandidateTextFields(item, slotNumber);
}

/**
 * Validates slot IDs present in raw candidate responses against allowed allocated slots.
 */
export function validateRawCandidateSlotIds(rawList: unknown[], allowedSlots: Set<string>): void {
  const seenRawSlots = new Set<string>();
  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const sId = record.slot_id ?? record.slotId;
    if (typeof sId !== "string" || !sId.trim()) continue;

    const normalizedSlot = sId.trim();
    if (!allowedSlots.has(normalizedSlot)) {
      throw new Error(`Unknown allocated slot "${normalizedSlot}"`);
    }
    if (seenRawSlots.has(normalizedSlot)) {
      throw new Error(`Duplicate candidate response for slot "${normalizedSlot}"`);
    }
    seenRawSlots.add(normalizedSlot);
  }
}

/**
 * Finds the index of a candidate matching the specified allocated slot.
 */
export function findCandidateIndexForSlot(rawList: unknown[], slot: AllocatedSlot, idx: number, usedRawIndices: Set<number>): number {
  let matchIdx = rawList.findIndex(
    (item, i) =>
      !usedRawIndices.has(i) &&
      item &&
      typeof item === "object" &&
      ((item as Record<string, unknown>).slot_id === slot.slotId || (item as Record<string, unknown>).slotId === slot.slotId),
  );

  if (matchIdx === -1 && !usedRawIndices.has(idx)) {
    const candidateAtIdx = rawList[idx];
    if (candidateAtIdx && typeof candidateAtIdx === "object" && !Array.isArray(candidateAtIdx)) {
      const itemObj = candidateAtIdx as Record<string, unknown>;
      const explicitSlotId = (itemObj.slot_id ?? itemObj.slotId) as string | undefined;
      if (!explicitSlotId || (typeof explicitSlotId === "string" && (!explicitSlotId.trim() || explicitSlotId.trim() === slot.slotId))) {
        matchIdx = idx;
      }
    }
  }

  if (matchIdx === -1) {
    throw new Error(`Missing candidate response for allocated slot "${slot.slotId}"`);
  }

  return matchIdx;
}
