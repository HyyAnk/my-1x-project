import {
  makeId,
  nowIso,
  TopicCandidateSchema,
  TopicRunCandidateSchema,
  TopicRunResultSchema,
  type EpisodeTopicCandidate,
  type ShortReelTopicCandidate,
  type TopicCandidate,
  type TopicProvenanceOrigin,
  type TopicRunCandidate,
  type TopicRunResult,
  type TopicSourceShortage,
} from "@studio/shared";
import type { TopicMatrixPlan, TopicMatrixSlotPlan } from "./topicMatrixPlanner.js";
import type { AllocatedSlot } from "./bankTopicAllocation.js";

function extractRawCandidates(rawOutput: unknown): unknown[] {
  if (Array.isArray(rawOutput)) {
    return rawOutput;
  }

  if (typeof rawOutput === "object" && rawOutput !== null) {
    const record = rawOutput as Record<string, unknown>;
    if (Array.isArray(record.candidates)) {
      return record.candidates;
    }
    if (Array.isArray(record.topics)) {
      return record.topics;
    }
  }

  if (typeof rawOutput === "string") {
    let clean = rawOutput.trim();
    clean = clean
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed: unknown = JSON.parse(clean);
      return extractRawCandidates(parsed);
    } catch {
      const startIdx = clean.indexOf("[");
      const endIdx = clean.lastIndexOf("]");
      if (startIdx !== -1 && endIdx > startIdx) {
        try {
          const parsed: unknown = JSON.parse(clean.substring(startIdx, endIdx + 1));
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // Fall through to next check
        }
      }

      const objStart = clean.indexOf("{");
      const objEnd = clean.lastIndexOf("}");
      if (objStart !== -1 && objEnd > objStart) {
        try {
          const parsed: unknown = JSON.parse(clean.substring(objStart, objEnd + 1));
          return extractRawCandidates(parsed);
        } catch {
          // Fall through to throw
        }
      }
    }
  }

  throw new Error("Raw output does not contain an array of topic candidates");
}

function extractCandidateTextFields(item: Record<string, unknown>, slotNumber: number) {
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

function checkSlotKindAndArchetype(item: Record<string, unknown>, slotPlan: TopicMatrixSlotPlan, slotNumber: number) {
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

function buildShortReelSlotCandidate(
  item: Record<string, unknown>,
  slotPlan: TopicMatrixSlotPlan,
  textFields: ReturnType<typeof extractCandidateTextFields>,
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

function buildEpisodeSlotCandidate(
  item: Record<string, unknown>,
  slotPlan: TopicMatrixSlotPlan,
  textFields: ReturnType<typeof extractCandidateTextFields>,
  channelId: string,
  origin: TopicProvenanceOrigin,
  themeHint?: string,
): TopicCandidate {
  const topicId = typeof item.topic_id === "string" && item.topic_id.trim() ? item.topic_id.trim() : makeId("topic_ep");

  const domainId = typeof item.domain_id === "string" ? item.domain_id.trim() : slotPlan.domainId;
  const subtopicId = typeof item.subtopic_id === "string" ? item.subtopic_id.trim() : undefined;

  const visualStyle = typeof item.visual_style === "string" ? (item.visual_style as EpisodeTopicCandidate["visual_style"]) : "mixed";
  const ageBand = typeof item.age_band === "string" ? (item.age_band as EpisodeTopicCandidate["age_band"]) : "7-9";

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

function validateSingleCandidateSlot(
  raw: unknown,
  slotPlan: TopicMatrixSlotPlan,
  slotIndex: number,
  channelId: string,
  plan: TopicMatrixPlan,
): TopicCandidate {
  const slotNumber = slotIndex + 1;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`Slot ${slotNumber} candidate is not a valid JSON object`);
  }

  const item = raw as Record<string, unknown>;
  const textFields = extractCandidateTextFields(item, slotNumber);
  checkSlotKindAndArchetype(item, slotPlan, slotNumber);

  const hasKeyword = Boolean(plan.steeredKeyword && plan.steeredKeyword.trim());
  const isSteered = hasKeyword && (slotIndex === 0 || slotIndex === 3);
  const origin: TopicProvenanceOrigin = isSteered ? "keyword" : "discovery";
  const themeHint = isSteered ? plan.steeredKeyword : undefined;

  if (slotPlan.contentKind === "short_reel") {
    return buildShortReelSlotCandidate(item, slotPlan, textFields, channelId, origin, themeHint);
  }

  return buildEpisodeSlotCandidate(item, slotPlan, textFields, channelId, origin, themeHint);
}

/**
 * Validates generated topic candidates strictly against an assigned TopicMatrixPlan.
 */
export function validateTopicCandidateSlots(rawOutput: unknown, plan: TopicMatrixPlan, channelId: string): TopicCandidate[] {
  const rawList = extractRawCandidates(rawOutput);

  if (rawList.length !== 5) {
    throw new Error(`Expected exactly 5 topic candidates, got ${rawList.length}`);
  }

  const candidates = rawList.map((raw, idx) => validateSingleCandidateSlot(raw, plan.slots[idx], idx, channelId, plan));
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (ids.has(candidate.topic_id)) throw new Error(`Topic candidates contain duplicate topic_id "${candidate.topic_id}"`);
    ids.add(candidate.topic_id);
  }
  return candidates;
}

export interface ValidateTopicResponseInput {
  rawOutput: unknown;
  allocatedSlots: AllocatedSlot[];
  channelId: string;
  runId?: string;
  shortages?: TopicSourceShortage[];
}

export function validateTopicCandidateResponse(input: ValidateTopicResponseInput): TopicRunResult {
  const { rawOutput, allocatedSlots, channelId, runId, shortages = [] } = input;
  const rawList = extractRawCandidates(rawOutput);
  const allowedSlots = new Set(allocatedSlots.map((slot) => slot.slotId));

  // Check if rawList has duplicate responses for the same slot
  const seenRawSlots = new Set<string>();
  for (const item of rawList) {
    if (item && typeof item === "object") {
      const sId = (item as Record<string, unknown>).slot_id ?? (item as Record<string, unknown>).slotId;
      if (typeof sId === "string" && sId.trim()) {
        const normalizedSlot = sId.trim();
        if (!allowedSlots.has(normalizedSlot)) throw new Error(`Unknown allocated slot "${normalizedSlot}"`);
        if (seenRawSlots.has(normalizedSlot)) {
          throw new Error(`Duplicate candidate response for slot "${normalizedSlot}"`);
        }
        seenRawSlots.add(normalizedSlot);
      }
    }
  }

  const seenSlots = new Set<string>();
  if (rawList.length !== allocatedSlots.length) {
    throw new Error("Candidate response count does not match allocated slots");
  }
  const candidates: TopicRunCandidate[] = [];
  const usedRawIndices = new Set<number>();

  for (let idx = 0; idx < allocatedSlots.length; idx += 1) {
    const slot = allocatedSlots[idx];
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

    usedRawIndices.add(matchIdx);
    const match = rawList[matchIdx];

    if (seenSlots.has(slot.slotId)) {
      throw new Error(`Duplicate candidate response for slot "${slot.slotId}"`);
    }
    seenSlots.add(slot.slotId);

    const item = match as Record<string, unknown>;
    const textFields = extractCandidateTextFields(item, slot.slot);

    const topicId = makeId(slot.contentKind === "short_reel" ? "topic_reel" : "topic_ep");

    const origin: TopicProvenanceOrigin = slot.isKeySteered ? "keyword" : "discovery";
    const themeHint = slot.isKeySteered ? slot.domainTitle : undefined;

    let candidateData: TopicCandidate;
    if (slot.contentKind === "short_reel") {
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
      candidateData = TopicCandidateSchema.parse(shortReelCandidate);
    } else {
      const visualStyle = typeof item.visual_style === "string" ? (item.visual_style as EpisodeTopicCandidate["visual_style"]) : "mixed";
      const ageBand = typeof item.age_band === "string" ? (item.age_band as EpisodeTopicCandidate["age_band"]) : "7-9";

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
      candidateData = TopicCandidateSchema.parse(episodeCandidate);
    }

    const runCandidate = TopicRunCandidateSchema.parse({
      ...candidateData,
      slot_id: slot.slotId,
      source_bindings: slot.sourceBindings,
    });
    candidates.push(runCandidate);
  }

  return TopicRunResultSchema.parse({
    run_id: runId || makeId("run"),
    target_episode_count: 3,
    target_short_reel_count: 2,
    candidates,
    shortages,
  });
}
