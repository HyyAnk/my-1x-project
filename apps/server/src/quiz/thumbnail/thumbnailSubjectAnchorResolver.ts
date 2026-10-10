import type { ThumbnailLayoutType } from "@studio/shared";
import type { QuizSubjectAnchor, ResolveThumbnailInput } from "./thumbnailTypes.js";
import type { SubjectDomainCategory } from "./thumbnailSubjectDomain.types.js";
import { SUBJECT_DOMAIN_KEYWORD_RULES } from "./thumbnailSubjectDomainKeywords.js";
import { resolveThemedFallbackAnchors } from "./thumbnailThemedFallbackAnchors.js";

export type { SubjectDomainCategory } from "./thumbnailSubjectDomain.types.js";

/**
 * Detects topic domain category from title and summary keywords.
 */
export function detectSubjectDomain(topicLower: string): SubjectDomainCategory {
  const rule = SUBJECT_DOMAIN_KEYWORD_RULES.find((candidate) =>
    candidate.keywords.some((keyword) => topicLower.includes(keyword)),
  );
  return rule ? rule.domain : "general";
}

/**
 * Enriches choice text with topic domain context (e.g. "France" in a Cookie quiz -> "authentic specialty cookie representing France").
 */
export function contextualizeChoiceSubject(choice: string, topicLower: string): string {
  const trimmed = choice.trim();
  const domain = detectSubjectDomain(topicLower);

  switch (domain) {
    case "food":
      if (
        topicLower.includes("bake") ||
        topicLower.includes("cookie") ||
        topicLower.includes("biscuit") ||
        topicLower.includes("pastry") ||
        topicLower.includes("dessert") ||
        topicLower.includes("culinary")
      ) {
        return `delicious authentic specialty cookie or pastry representing ${trimmed}`;
      }
      return `delicious artisanal gourmet dish representing ${trimmed}`;

    case "supercars":
      return `luxury high-speed exotic sports car from ${trimmed}`;

    case "medical":
      return `essential emergency medical clinic item or tool: ${trimmed}`;

    case "school":
      return `essential school classroom educational item: ${trimmed}`;

    case "gaming":
      return `vibrant 3D arcade gaming artifact: ${trimmed}`;

    case "science":
      return `scientific laboratory research artifact representing ${trimmed}`;

    case "norse":
      return `authentic Norse mythical artifact or legendary figure: ${trimmed}`;

    case "greek":
      return `authentic Greek mythical Olympian artifact or hero: ${trimmed}`;

    case "history":
      return `authentic historical archaeological artifact representing ${trimmed}`;

    case "ocean":
      return `deep ocean marine life creature or aquatic artifact representing ${trimmed}`;

    case "animals":
      return `realistic 3D wildlife animal model of ${trimmed}`;

    case "space":
      return `celestial astronomical 3D model representing ${trimmed}`;

    case "fantasy":
      return `magical mythic fantasy artifact representing ${trimmed}`;

    default:
      if (topicLower.includes("weapon") || topicLower.includes("sword") || topicLower.includes("blade") || topicLower.includes("armor")) {
        return `legendary iconic artifact weapon representing ${trimmed}`;
      }
      return trimmed;
  }
}

/**
 * Strips question words, auxiliary verbs, and punctuation to extract pure visual noun subjects.
 */
export function cleanSubjectFromQuestion(question: string, answer?: string): string {
  if (answer && answer.trim().length > 0 && answer.trim().length < 40) {
    return answer.trim();
  }
  let cleaned = question
    .replace(/^(which|what|where|who|how|why|when|is|are|can|do|does|did|find|spot|guess|choose)\s+(is|are|the|a|an|of)?\s*/i, "")
    .replace(/\b(could|can|would|should)\s+(float in water|fly|survive|live|happen|win|be|exist)\b/gi, "")
    .replace(/[?!.:,;]+$/g, "")
    .trim();

  if (!cleaned || cleaned.length < 3) {
    cleaned = "mystery trivia subject";
  }
  return cleaned;
}

/**
 * Extracts 2 to 4 visual subject anchors for grid/versus layouts.
 * Ensures anchors only describe visual 3D objects, NEVER raw question sentences.
 */
export function resolveSubjectAnchors(input: ResolveThumbnailInput, layout: ThumbnailLayoutType): QuizSubjectAnchor[] {
  const anchors: QuizSubjectAnchor[] = [];
  const topicLower = `${input.topicTitle} ${input.topicSummary || ""}`.toLowerCase();
  const domain = detectSubjectDomain(topicLower);

  if (input.questions && input.questions.length > 0) {
    const firstQ = input.questions[0];

    // Priority 1: If first question has multiple visual choices (e.g. 4 choices for a 2x2 grid or 2 choices for VS)
    if (firstQ.choices && firstQ.choices.length >= 2 && (layout === "mega_grid" || layout === "split_vs")) {
      const limit = layout === "split_vs" ? 2 : Math.min(firstQ.choices.length, 4);
      for (let i = 0; i < limit; i++) {
        const choice = firstQ.choices[i];
        const isAnswer = firstQ.answer
          ? choice.toLowerCase().includes(firstQ.answer.toLowerCase()) || firstQ.answer.toLowerCase().includes(choice.toLowerCase())
          : i === 0;
        const enrichedVisual = contextualizeChoiceSubject(choice, topicLower);
        anchors.push({
          label: `Option ${i + 1}`,
          visualPrompt: `3D visual icon of ${enrichedVisual}`,
          badge: isAnswer ? "✓" : undefined,
        });
      }
    } else {
      // Priority 2: Distinct subjects from multiple questions (clean noun phrases)
      for (let i = 0; i < Math.min(input.questions.length, 4); i++) {
        const q = input.questions[i];
        const subject = cleanSubjectFromQuestion(q.question, q.answer);
        const enrichedVisual = contextualizeChoiceSubject(subject, topicLower);
        anchors.push({
          label: `Subject ${i + 1}`,
          visualPrompt: `3D visual icon of ${enrichedVisual}`,
          badge: i === 0 ? "✓" : undefined,
        });
      }
    }
  }

  // Fallback themed anchors if no specific question prompts provided
  if (anchors.length === 0) {
    return resolveThemedFallbackAnchors(domain, layout);
  }

  return anchors;
}
