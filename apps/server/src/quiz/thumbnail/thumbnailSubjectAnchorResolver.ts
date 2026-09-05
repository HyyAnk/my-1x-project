import type { ThumbnailLayoutType } from "@studio/shared";
import type { QuizSubjectAnchor, ResolveThumbnailInput } from "./thumbnailTypes.js";

/**
 * Enriches choice text with topic domain context (e.g. "France" in a Cookie quiz -> "authentic specialty cookie representing France").
 */
export function contextualizeChoiceSubject(choice: string, topicLower: string): string {
  const trimmed = choice.trim();
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
  if (
    topicLower.includes("supercar") ||
    topicLower.includes("hypercar") ||
    topicLower.includes("racing") ||
    topicLower.includes("racecar")
  ) {
    return `luxury high-speed exotic sports car from ${trimmed}`;
  }
  if (
    topicLower.includes("weapon") ||
    topicLower.includes("sword") ||
    topicLower.includes("blade") ||
    topicLower.includes("armor")
  ) {
    return `legendary iconic artifact weapon representing ${trimmed}`;
  }
  return trimmed;
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
 * Ensures anchors only describe visual 3D objects, NEVER question sentences.
 */
export function resolveSubjectAnchors(input: ResolveThumbnailInput, layout: ThumbnailLayoutType): QuizSubjectAnchor[] {
  const anchors: QuizSubjectAnchor[] = [];
  const topicLower = `${input.topicTitle} ${input.topicSummary || ""}`.toLowerCase();

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

  // Fallback default anchors if no specific question prompts provided
  if (anchors.length === 0) {
    if (layout === "split_vs") {
      anchors.push(
        { label: "Option A", visualPrompt: "Epic glowing fiery prehistoric Tyrannosaurus Rex" },
        { label: "Option B", visualPrompt: "Futuristic heavy armored laser Mecha Robot in icy blizzards" },
      );
    } else if (layout === "mystery_silhouette") {
      anchors.push({
        label: "Mystery Subject",
        visualPrompt: "Pitch-black mysterious superhero silhouette enveloped in glowing cyan neon question mark '?' and dark mist",
      });
    } else if (layout === "odd_one_out") {
      anchors.push({
        label: "Odd Element",
        visualPrompt: "3x3 matrix grid of cheerful yellow ducklings where one wears cool sunglasses and smirk, highlighted with red circle ⭕",
      });
    } else if (layout === "difficulty_tier") {
      anchors.push(
        { label: "Level 1", visualPrompt: "Green Easy puzzle piece" },
        { label: "Level 2", visualPrompt: "Yellow Medium math equations" },
        { label: "Level 3", visualPrompt: "Orange Hard complex glowing gears" },
        { label: "Level 4", visualPrompt: "Purple Impossible blazing cosmic supernova brain 🔥" },
      );
    } else if (layout === "true_false") {
      anchors.push({
        label: "Statement Subject",
        visualPrompt: "Mind-bending visual paradox: goldfish swimming inside a floating water sphere in zero-gravity space",
      });
    } else {
      // Mega grid defaults
      anchors.push(
        { label: "History", visualPrompt: "Ancient Giza Pyramids under glowing desert sun", badge: "✓" },
        { label: "Science", visualPrompt: "Albert Einstein with glowing holographic brain" },
        { label: "Nature", visualPrompt: "Great white shark swimming in deep crystal ocean" },
        { label: "Space", visualPrompt: "Planet Saturn glowing in colorful cosmic nebula with rocket" },
      );
    }
  }

  return anchors;
}
