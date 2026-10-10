import type { BankIndex, BankTaxonomy, TopicContentKind } from "@studio/shared";
import {
  CANONICAL_FALLBACK_DOMAINS,
  generateRandomSlotDefinitions,
  KEYWORD_SYNONYMS,
  shuffleArray,
  type TopicSlotArchetypeDefinition,
} from "./topicMatrix.constants.js";
import type { TopicMatrixDomainOption, TopicMatrixPlan, TopicMatrixSlotPlan } from "./topicMatrix.types.js";

export {
  ARCHETYPE_SLOT_DEFINITIONS,
  CANONICAL_FALLBACK_DOMAINS,
  generateRandomSlotDefinitions,
  KEYWORD_SYNONYMS,
  QUIZ_SHORT_ARCHETYPE_DEFINITIONS,
  shuffleArray,
  type TopicSlotArchetypeDefinition,
  type TopicSlotDefinition,
} from "./topicMatrix.constants.js";
export type {
  TopicMatrixPlan,
  TopicMatrixQuizFormat,
  TopicMatrixSlotArchetype,
  TopicMatrixSlotPlan,
  TopicMatrixSuggestedLayout,
} from "./topicMatrix.types.js";
export { formatTopicMatrixPrompt, QUIZ_SHORT_PROMPT_CONTRACT, type TopicMatrixPromptSections } from "./topicMatrixPromptFormatter.js";

/** Pools are planned in Topics tab order; each kind draws domains independently. */
const POOL_KINDS: readonly TopicContentKind[] = ["episode", "quiz_short", "short_reel"];

function normalizeString(val: string): string {
  return val.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function calculateDomainKeywordRelevance(domain: TopicMatrixDomainOption, hintTokens: string[]): number {
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

function fillWithFallbackDomains(chosen: TopicMatrixDomainOption[], count: number): TopicMatrixDomainOption[] {
  if (chosen.length >= count) return chosen;
  const chosenIds = new Set(chosen.map((d) => d.id));
  const fallbacks = shuffleArray(CANONICAL_FALLBACK_DOMAINS.filter((d) => !chosenIds.has(d.id)));
  while (chosen.length < count && fallbacks.length > 0) {
    chosen.push(fallbacks.pop()!);
  }
  return chosen;
}

function selectPoolDomains(
  availableDomains: TopicMatrixDomainOption[],
  count: number,
  steeredDomain?: TopicMatrixDomainOption,
): TopicMatrixDomainOption[] {
  if (steeredDomain) {
    const remaining = shuffleArray(availableDomains.filter((d) => d.id !== steeredDomain.id));
    return fillWithFallbackDomains([steeredDomain, ...remaining.slice(0, count - 1)], count);
  }
  return fillWithFallbackDomains(shuffleArray(availableDomains).slice(0, count), count);
}

function resolveSteeredDomain(availableDomains: TopicMatrixDomainOption[], trimmedHint: string): TopicMatrixDomainOption {
  const hintTokens = normalizeString(trimmedHint).split(/\s+/).filter(Boolean);
  const scoredDomains = availableDomains.map((domain) => ({ domain, relevance: calculateDomainKeywordRelevance(domain, hintTokens) }));
  // Sort by relevance descending; tie-break randomly for variety among equal relevance
  scoredDomains.sort((a, b) => b.relevance - a.relevance || Math.random() - 0.5);
  return scoredDomains[0]?.domain || CANONICAL_FALLBACK_DOMAINS[0];
}

/** Assigns one independently rotated domain pool per content kind, keyed by slot number. */
function assignPoolDomains(
  slotDefinitions: ReadonlyArray<TopicSlotArchetypeDefinition & { slot: number }>,
  availableDomains: TopicMatrixDomainOption[],
  steeredDomain?: TopicMatrixDomainOption,
): { domainBySlot: Map<number, TopicMatrixDomainOption>; steeredSlots: Set<number> } {
  const domainBySlot = new Map<number, TopicMatrixDomainOption>();
  const steeredSlots = new Set<number>();
  for (const kind of POOL_KINDS) {
    const kindSlots = slotDefinitions.filter((def) => def.contentKind === kind);
    if (kindSlots.length === 0) continue;
    const domains = selectPoolDomains(availableDomains, kindSlots.length, steeredDomain);
    kindSlots.forEach((def, index) => domainBySlot.set(def.slot, domains[index] || CANONICAL_FALLBACK_DOMAINS[index]));
    if (steeredDomain) steeredSlots.add(kindSlots[0].slot);
  }
  return { domainBySlot, steeredSlots };
}

export function planTopicSuggestionMatrix(options: {
  taxonomy?: BankTaxonomy | null;
  index?: BankIndex | null;
  topicHint?: string;
  aspectRatio?: "16:9";
  slotDefinitions?: Array<TopicSlotArchetypeDefinition & { slot: number }>;
}): TopicMatrixPlan {
  const { taxonomy, index, topicHint, slotDefinitions: customSlots } = options;
  const slotDefinitions = customSlots || generateRandomSlotDefinitions();
  const availableDomains = extractNormalizedDomains(taxonomy, index);
  const trimmedHint = topicHint?.trim();
  const steeredDomain = trimmedHint ? resolveSteeredDomain(availableDomains, trimmedHint) : undefined;
  const { domainBySlot, steeredSlots } = assignPoolDomains(slotDefinitions, availableDomains, steeredDomain);

  const slots: TopicMatrixSlotPlan[] = slotDefinitions.map((def, idx) => {
    const assignedDomain = domainBySlot.get(def.slot) || CANONICAL_FALLBACK_DOMAINS[idx];
    return {
      slot: def.slot,
      name: def.name,
      domainId: assignedDomain.id,
      domainTitle: assignedDomain.title,
      archetype: def.archetype,
      suggestedLayout: def.suggestedLayout,
      quizFormat: def.quizFormat,
      description: def.description,
      isKeySteered: steeredSlots.has(def.slot),
      contentKind: def.contentKind,
    };
  });

  return { slots, steeredKeyword: trimmedHint || undefined, aspectRatio: "16:9" };
}
