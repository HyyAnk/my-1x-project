import type { BankIndex, BankTaxonomy } from "@studio/shared";
import { ARCHETYPE_SLOT_DEFINITIONS, CANONICAL_FALLBACK_DOMAINS, KEYWORD_SYNONYMS } from "./topicMatrix.constants.js";
import type { TopicMatrixPlan, TopicMatrixSlotPlan } from "./topicMatrix.types.js";

export { ARCHETYPE_SLOT_DEFINITIONS, CANONICAL_FALLBACK_DOMAINS, KEYWORD_SYNONYMS } from "./topicMatrix.constants.js";
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

export function planTopicSuggestionMatrix(options: {
  taxonomy?: BankTaxonomy | null;
  index?: BankIndex | null;
  topicHint?: string;
  aspectRatio?: "16:9";
}): TopicMatrixPlan {
  const { taxonomy, index, topicHint, aspectRatio: _aspectRatio } = options;
  const slotDefinitions = ARCHETYPE_SLOT_DEFINITIONS;
  const availableDomains = extractNormalizedDomains(taxonomy, index);
  const trimmedHint = topicHint?.trim();

  let selectedSix: Array<{ id: string; title: string; description: string }> = [];

  if (trimmedHint) {
    const hintTokens = normalizeString(trimmedHint).split(/\s+/).filter(Boolean);
    const scoredDomains = availableDomains.map((domain) => ({
      domain,
      relevance: calculateDomainKeywordRelevance(domain, hintTokens),
    }));

    scoredDomains.sort((a, b) => b.relevance - a.relevance || b.domain.score - a.domain.score);

    const steeredDomains = [scoredDomains[0].domain, scoredDomains[1].domain];
    const steeredIds = new Set(steeredDomains.map((d) => d.id));

    const remainingDomains = scoredDomains
      .filter((sd) => !steeredIds.has(sd.domain.id))
      .map((sd) => sd.domain)
      .sort((a, b) => b.score - a.score);

    // Slot 1 (idx 0): Episode, keyword-directed
    // Slot 2 (idx 1): Episode, discovery
    // Slot 3 (idx 2): Episode, discovery
    // Slot 4 (idx 3): Short-Reel, keyword-directed
    // Slot 5 (idx 4): Short-Reel, discovery
    // Slot 6 (idx 5): Short-Reel, discovery
    selectedSix = [
      steeredDomains[0],
      remainingDomains[0],
      remainingDomains[1],
      steeredDomains[1],
      remainingDomains[2],
      remainingDomains[3] || CANONICAL_FALLBACK_DOMAINS[5],
    ];
  } else {
    const sorted = [...availableDomains].sort((a, b) => b.score - a.score);
    selectedSix = sorted.slice(0, 6);
  }

  const slots: TopicMatrixSlotPlan[] = slotDefinitions.map((def, idx) => {
    const assignedDomain = selectedSix[idx] || CANONICAL_FALLBACK_DOMAINS[idx];
    const isKeySteered = Boolean(trimmedHint && (idx === 0 || idx === 3));
    const contentKind: "episode" | "short_reel" = idx >= 3 ? "short_reel" : "episode";
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
      contentKind,
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
  const [slot1, slot2, slot3, slot4, slot5, slot6] = plan.slots;

  let hintGuidance = "";
  if (trimmedHint) {
    hintGuidance = `\nIMPORTANT TOPIC THEME REQUIREMENT: The user specifically requested ideas relating to "${trimmedHint}". Exactly 2 candidates MUST be directly inspired by, focused on, or explore specific creative angles of "${trimmedHint}" (include "theme_hint": "${trimmedHint}" in those 2 JSON objects). Slot 1 (Episode) is steered to domain "${slot1.domainId}" (${slot1.domainTitle}) and Slot 4 (Short-Reel) is steered to domain "${slot4.domainId}" (${slot4.domainTitle}). The remaining 4 candidates should be diverse, creative discovery topics aligned with the overall channel DNA, sourced from 4 different domains ("${slot2.domainId}", "${slot3.domainId}", "${slot5.domainId}", "${slot6.domainId}"), and MUST NOT reuse the keyword.`;
  }

  const blueprintGuidance = `\nGAMEPLAY ARCHETYPE BLUEPRINTS FOR DIVERSITY:
- Slot 1 (Episode - Deep Trivia): ${slot1.description} (domain_id: "${slot1.domainId}", content_kind: "episode", quiz_format: "multiple_choice", archetype: "deep_trivia", suggested_layout: "media_left_choices_right").
- Slot 2 (Episode - Mystery Reveal): ${slot2.description} (domain_id: "${slot2.domainId}", content_kind: "episode", quiz_format: "image_guess", archetype: "mystery_reveal", suggested_layout: "mystery_reveal").
- Slot 3 (Episode - True or False): ${slot3.description} (domain_id: "${slot3.domainId}", content_kind: "episode", quiz_format: "true_false", archetype: "verdict_true_false", suggested_layout: "verdict_true_false").
- Slot 4 (Short-Reel - Versus Face-off): ${slot4.description} (domain_id: "${slot4.domainId}", content_kind: "short_reel", archetype: "versus_faceoff", question_count: 1, aspect_ratio: "9:16").
- Slot 5 (Short-Reel - Deep Trivia): ${slot5.description} (domain_id: "${slot5.domainId}", content_kind: "short_reel", archetype: "deep_trivia", question_count: 1, aspect_ratio: "9:16").
- Slot 6 (Short-Reel - Versus Clash): ${slot6.description} (domain_id: "${slot6.domainId}", content_kind: "short_reel", archetype: "versus_faceoff", question_count: 1, aspect_ratio: "9:16").`;

  const outputContract = `Return exactly 6 JSON candidates: Slots 1-3 are Episode concepts (content_kind: "episode", 3-10 questions, landscape layout), Slots 4-6 are Short-Reel concepts (content_kind: "short_reel", question_count: 1, 9:16 vertical, archetype "versus_faceoff" or "deep_trivia"). Each candidate must have title, premise, why_it_fits, hook, estimated_potential, domain_id, and content_kind.${blueprintGuidance}${hintGuidance} Do not research or develop them further.`;

  return {
    hintGuidance,
    blueprintGuidance,
    outputContract,
  };
}
