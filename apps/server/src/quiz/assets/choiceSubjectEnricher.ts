export const FRANCHISE_PREFIX_REGEX = /^In\s+([^,?:;]+?),\s*/i;

export interface ChoiceSubjectContext {
  choice: { id: string; text: string };
  question: {
    question: string;
    visual_opportunity?: string;
    correct_choice_id?: string;
  };
  isGraphicQuestion?: boolean;
}

/**
 * Resolves graphic choice subjects for flags, logos, emblems, and symbols.
 */
export function resolveGraphicChoiceSubject(
  choiceText: string,
  question: { question: string; visual_opportunity?: string },
): string {
  const combined = `${question.question} ${question.visual_opportunity || ""}`.toLowerCase();
  const text = choiceText.trim();
  if (/\b(flag|flags)\b/i.test(combined)) {
    if (!/\b(flag|flags)\b/i.test(text)) {
      return `Official national flag of ${text}, clean 2D graphic vector illustration`;
    }
  } else if (/\b(logo|logos|brand|brands)\b/i.test(combined)) {
    if (!/\b(logo|logos|brand)\b/i.test(text)) {
      return `Official minimalist vector brand logo of ${text}, clean graphic design icon`;
    }
  } else if (/\b(emblem|insignia|crest|monogram|symbol)\b/i.test(combined)) {
    if (!/\b(emblem|insignia|crest|symbol)\b/i.test(text)) {
      return `Official vector emblem or symbol of ${text}, clean graphic design mark`;
    }
  }
  return text;
}

/**
 * Extracts the canonical umbrella franchise or universe from a question prompt or visual opportunity.
 * Supports patterns like "In Doraemon, ...", "In Spider-Man, ...", "In Dragon Ball Z, ...".
 */
export function extractFranchiseContext(questionText: string, visualOpportunity?: string): string | null {
  const match = questionText.match(FRANCHISE_PREFIX_REGEX);
  if (match && match[1]) {
    const candidate = match[1].trim();
    if (candidate.length <= 40) {
      return candidate;
    }
  }

  // Fallback: check visual opportunity for "from <Franchise>" pattern
  if (visualOpportunity) {
    const fromMatch = visualOpportunity.match(/\bfrom\s+([A-Z][a-zA-Z0-9\s'&:-]+?)(?:,|$|\.|\bwith\b|\bin\b)/);
    if (fromMatch && fromMatch[1]) {
      const candidate = fromMatch[1].trim();
      if (candidate.length <= 40) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Enriches a choice asset subject with parent franchise context and lore clues to prevent
 * AI image generators from misinterpreting abstract phrasing into bizarre literal objects.
 */
export function resolveChoiceAssetSubject(params: ChoiceSubjectContext): string {
  const { choice, question, isGraphicQuestion } = params;

  if (isGraphicQuestion) {
    return resolveGraphicChoiceSubject(choice.text, question);
  }

  const rawChoiceText = choice.text.trim();
  const franchise = extractFranchiseContext(question.question, question.visual_opportunity);

  if (!franchise) {
    return rawChoiceText;
  }

  // If choice text already contains the franchise name, avoid redundant repetition
  const lowerChoice = rawChoiceText.toLowerCase();
  const lowerFranchise = franchise.toLowerCase();
  if (lowerChoice.includes(lowerFranchise)) {
    return rawChoiceText;
  }

  const isCorrectChoice = Boolean(question.correct_choice_id && choice.id === question.correct_choice_id);

  // For the correct answer, if visual_opportunity has relevant descriptive clues, enrich subject
  if (isCorrectChoice && question.visual_opportunity) {
    const vo = question.visual_opportunity;
    const loreHints: string[] = [];
    if (/\b(4d|dimensional|white belly|half-moon|bell)\b/i.test(vo) && /\bpocket\b/i.test(rawChoiceText)) {
      loreHints.push("iconic white 4D dimensional pouch attached to belly");
    } else if (/\b(straw hat|red ribbon)\b/i.test(vo) && /\bhat\b/i.test(rawChoiceText)) {
      loreHints.push("iconic straw hat with red ribbon");
    }

    if (loreHints.length > 0) {
      return `In ${franchise}: ${rawChoiceText} (${loreHints.join(", ")})`;
    }
  }

  // Standard franchise-anchored subject: gives AI the explicit universe context
  return `In ${franchise}: ${rawChoiceText}`;
}
