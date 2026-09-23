import type { BankIndex, BankTaxonomy } from "@studio/shared";
import {
  ARCHETYPE_SLOT_DEFINITIONS,
  CANONICAL_FALLBACK_DOMAINS,
  generateRandomSlotDefinitions,
  KEYWORD_SYNONYMS,
  shuffleArray,
  type TopicSlotArchetypeDefinition,
} from "./topicMatrix.constants.js";
import type { TopicMatrixPlan, TopicMatrixSlotPlan } from "./topicMatrix.types.js";

export {
  ARCHETYPE_SLOT_DEFINITIONS,
  CANONICAL_FALLBACK_DOMAINS,
  generateRandomSlotDefinitions,
  KEYWORD_SYNONYMS,
  shuffleArray,
  type TopicSlotArchetypeDefinition,
} from "./topicMatrix.constants.js";
export type {
  TopicMatrixPlan,
  TopicMatrixQuizFormat,
  TopicMatrixSlotArchetype,
  TopicMatrixSlotPlan,
  TopicMatrixSuggestedLayout,
} from "./topicMatrix.types.js";

function normalizeString(val: string): string {
  return val
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function calculateDomainKeywordRelevance(domain: { id: string; title: string; description?: string }, hintTokens: string[]): number {
  if (hintTokens.length === 0) return 0;
  let score = 0;
  const normalizedId = normalizeString(domain.id);
  const normalizedTitle = normalizeString(domain.title);
  const normalizedDesc = normalizeString(domain.description || "");
  const synonyms = KEYWORD_SYNONYMS[domain.id] || [];

  for (const token of hintTokens) {
    if (token.length < 2) continue;
    if (normalizedId.includes(token)) score += 10;
    if (normalizedTitle.includes(token)) score += 8;
    if (normalizedDesc.includes(token)) score += 4;
    for (const syn of synonyms) {
      if (syn.includes(token) || token.includes(syn)) {
        score += 6;
      }
    }
  }

  return score;
}

export function extractNormalizedDomains(
  taxonomy?: BankTaxonomy | null,
  index?: BankIndex | null,
): Array<{ id: string; title: string; description: string; score: number }> {
  const domainMap = new Map<string, { id: string; title: string; description: string; score: number }>();

  if (taxonomy?.domains && Array.isArray(taxonomy.domains)) {
    for (const d of taxonomy.domains) {
      if (!d.id) continue;
      const questionCount = index?.by_domain?.[d.id] ?? 0;
      const subtopicCount = d.subtopics?.length ?? 0;
      const activityScore = questionCount * 10 + subtopicCount;
      domainMap.set(d.id, {
        id: d.id,
        title: d.title || d.id,
        description: d.description || "",
        score: activityScore,
      });
    }
  }

  for (const fallback of CANONICAL_FALLBACK_DOMAINS) {
    if (!domainMap.has(fallback.id)) {
      const questionCount = index?.by_domain?.[fallback.id] ?? 0;
      domainMap.set(fallback.id, {
        id: fallback.id,
        title: fallback.title,
        description: fallback.description,
        score: questionCount * 10,
      });
    }
  }

  return Array.from(domainMap.values());
}

function selectPoolDomains(
  availableDomains: Array<{ id: string; title: string; description?: string }>,
  count: number,
  steeredDomain?: { id: string; title: string; description?: string },
): Array<{ id: string; title: string; description?: string }> {
  if (steeredDomain) {
    const remaining = shuffleArray(availableDomains.filter((d) => d.id !== steeredDomain.id));
    const chosen = [steeredDomain, ...remaining.slice(0, count - 1)];
    if (chosen.length < count) {
      const chosenIds = new Set(chosen.map((d) => d.id));
      const fallbacks = shuffleArray(CANONICAL_FALLBACK_DOMAINS.filter((d) => !chosenIds.has(d.id)));
      while (chosen.length < count && fallbacks.length > 0) {
        chosen.push(fallbacks.pop()!);
      }
    }
    return chosen;
  }

  const shuffled = shuffleArray(availableDomains);
  const chosen: Array<{ id: string; title: string; description?: string }> = shuffled.slice(0, count);
  if (chosen.length < count) {
    const chosenIds = new Set(chosen.map((d) => d.id));
    const fallbacks = shuffleArray(CANONICAL_FALLBACK_DOMAINS.filter((d) => !chosenIds.has(d.id)));
    while (chosen.length < count && fallbacks.length > 0) {
      chosen.push(fallbacks.pop()!);
    }
  }
  return chosen;
}

export function planTopicSuggestionMatrix(options: {
  taxonomy?: BankTaxonomy | null;
  index?: BankIndex | null;
  topicHint?: string;
  aspectRatio?: "16:9";
  slotDefinitions?: Array<TopicSlotArchetypeDefinition & { slot: number }>;
}): TopicMatrixPlan {
  const { taxonomy, index, topicHint, aspectRatio: _aspectRatio, slotDefinitions: customSlots } = options;
  const slotDefinitions = customSlots || generateRandomSlotDefinitions();
  const availableDomains = extractNormalizedDomains(taxonomy, index);
  const trimmedHint = topicHint?.trim();

  const episodeSlotsCount = slotDefinitions.filter((s) => s.contentKind === "episode").length;
  const shortReelSlotsCount = slotDefinitions.filter((s) => s.contentKind === "short_reel").length;

  let episodeDomains: Array<{ id: string; title: string; description?: string }> = [];
  let shortReelDomains: Array<{ id: string; title: string; description?: string }> = [];

  if (trimmedHint) {
    const hintTokens = normalizeString(trimmedHint).split(/\s+/).filter(Boolean);
    const scoredDomains = availableDomains.map((domain) => ({
      domain,
      relevance: calculateDomainKeywordRelevance(domain, hintTokens),
    }));

    // Sort by relevance descending; tie-break randomly for variety among equal relevance
    scoredDomains.sort((a, b) => b.relevance - a.relevance || (Math.random() - 0.5));

    const topSteeredDomain = scoredDomains[0]?.domain || CANONICAL_FALLBACK_DOMAINS[0];
    episodeDomains = selectPoolDomains(availableDomains, episodeSlotsCount, topSteeredDomain);
    shortReelDomains = selectPoolDomains(availableDomains, shortReelSlotsCount, topSteeredDomain);
  } else {
    // Independent uniform random rotation for Episode and Short-Reel pools
    episodeDomains = selectPoolDomains(availableDomains, episodeSlotsCount);
    shortReelDomains = selectPoolDomains(availableDomains, shortReelSlotsCount);
  }

  const selectedDomains = [...episodeDomains, ...shortReelDomains];

  const slots: TopicMatrixSlotPlan[] = slotDefinitions.map((def, idx) => {
    const assignedDomain = selectedDomains[idx] || CANONICAL_FALLBACK_DOMAINS[idx];
    const isKeySteered = Boolean(trimmedHint && (idx === 0 || idx === episodeSlotsCount));
    return {
      slot: def.slot,
      name: def.name,
      domainId: assignedDomain.id,
      domainTitle: assignedDomain.title,
      archetype: def.archetype,
      suggestedLayout: def.suggestedLayout,
      quizFormat: def.quizFormat,
      description: def.description,
      isKeySteered,
      contentKind: def.contentKind,
    };
  });

  return {
    slots,
    steeredKeyword: trimmedHint || undefined,
    aspectRatio: "16:9",
  };
}

export function formatTopicMatrixPrompt(
  plan: TopicMatrixPlan,
  topicHint?: string,
  aspectRatio?: "16:9",
): {
  hintGuidance: string;
  blueprintGuidance: string;
  outputContract: string;
} {
  void aspectRatio;
  const trimmedHint = topicHint?.trim();
  const episodeSlots = plan.slots.filter((s) => s.contentKind === "episode");
  const shortReelSlots = plan.slots.filter((s) => s.contentKind === "short_reel");
  const totalCount = plan.slots.length;

  let hintGuidance = "";
  if (trimmedHint) {
    const steeredEp = episodeSlots.find((s) => s.isKeySteered) || episodeSlots[0];
    const steeredShort = shortReelSlots.find((s) => s.isKeySteered) || shortReelSlots[0];
    const otherDomains = plan.slots.filter((s) => !s.isKeySteered).map((s) => `"${s.domainId}"`);
    hintGuidance = `\nIMPORTANT TOPIC THEME REQUIREMENT: The user specifically requested ideas relating to "${trimmedHint}". Exactly 2 candidates MUST be directly inspired by, focused on, or explore specific creative angles of "${trimmedHint}" (include "theme_hint": "${trimmedHint}" in those 2 JSON objects). Slot ${steeredEp.slot} (Episode) is steered to domain "${steeredEp.domainId}" (${steeredEp.domainTitle}) and Slot ${steeredShort.slot} (Short-Reel) is steered to domain "${steeredShort.domainId}" (${steeredShort.domainTitle}). The remaining candidates should be diverse, creative discovery topics aligned with the overall channel DNA (sourced from domains: ${otherDomains.join(", ")}), and MUST NOT reuse the keyword.`;
  }

  const blueprintLines = plan.slots.map((s) => {
    const kindLabel = s.contentKind === "short_reel" ? "Short-Reel" : "Episode";
    const extraDetails =
      s.contentKind === "short_reel"
        ? `, question_count: 1, aspect_ratio: "9:16"`
        : `, quiz_format: "${s.quizFormat}", suggested_layout: "${s.suggestedLayout}"`;
    return `- Slot ${s.slot} (${kindLabel} - ${s.name}): ${s.description} (domain_id: "${s.domainId}", content_kind: "${s.contentKind}", archetype: "${s.archetype}"${extraDetails}).`;
  });
  const blueprintGuidance = `\nGAMEPLAY ARCHETYPE BLUEPRINTS FOR DIVERSITY:\n${blueprintLines.join("\n")}`;

  const outputContract = `Return exactly ${totalCount} JSON candidates: Slots 1-${episodeSlots.length} are Episode concepts (content_kind: "episode", 3-10 questions, landscape layout), Slots ${episodeSlots.length + 1}-${totalCount} are Short-Reel concepts (content_kind: "short_reel", question_count: 1, 9:16 vertical). Each candidate must have title, premise, why_it_fits, hook, estimated_potential, domain_id, and content_kind.${blueprintGuidance}${hintGuidance} Do not research or develop them further.`;

  return {
    hintGuidance,
    blueprintGuidance,
    outputContract,
  };
}
