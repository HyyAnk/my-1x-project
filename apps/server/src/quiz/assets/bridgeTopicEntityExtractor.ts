import {
  BridgeShowcaseItemSchema,
  type BridgeSceneConfig,
  type BridgeShowcaseItem,
  type QuizV2,
} from "@studio/shared";

/**
 * Normalizes a raw topic string into a clean, concise phrase.
 */
function cleanTopicTitle(rawTopic?: string): string {
  if (!rawTopic || !rawTopic.trim()) return "Quiz Challenge";
  let topic = rawTopic.trim();
  const colonIndex = topic.search(/[:：]/);
  if (colonIndex > 2) {
    topic = topic.slice(colonIndex + 1).trim() || topic.slice(0, colonIndex).trim();
  }
  return topic.replace(/[!?,;.:：]+$/, "").trim();
}

/**
 * Normalizes a text string to extract meaningful entity words for deduplication.
 */
function extractEntityKeywords(text?: string): Set<string> {
  if (!text) return new Set();
  const STOP_WORDS = new Set([
    "with", "from", "that", "this", "what", "which", "where", "when", "your", "their",
    "character", "iconic", "cinematic", "stylized", "portrait", "sacred", "golden",
    "scene", "avatar", "symbol", "emblem", "photo", "image", "illustration", "standing",
    "holding", "glowing", "background", "ambient", "peaceful", "friendly", "smiling",
    "card", "sticker", "figure", "visual", "opportunity", "quiz", "challenge", "topic",
    "the", "and", "for", "key", "related"
  ]);

  const words = text.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  return new Set(words.filter((w) => !STOP_WORDS.has(w)));
}

/**
 * Checks whether two subject descriptions share too much entity similarity.
 */
function isSimilarSubject(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const setA = extractEntityKeywords(a);
  const setB = extractEntityKeywords(b);
  if (setA.size === 0 || setB.size === 0) return false;

  let overlap = 0;
  for (const word of setA) {
    if (setB.has(word)) overlap++;
  }
  return overlap >= 2 || (overlap >= 1 && (setA.size <= 2 || setB.size <= 2));
}

/**
 * Extracts candidate visual phrases and key entities from quiz questions.
 */
function extractQuestionVisualClues(quiz: QuizV2): {
  symbols: string[];
  portraits: string[];
  scenes: string[];
  creatures: string[];
  characters: string[];
} {
  const symbols: string[] = [];
  const portraits: string[] = [];
  const scenes: string[] = [];
  const creatures: string[] = [];
  const characters: string[] = [];

  for (const q of quiz.questions) {
    const opp = q.visual_opportunity?.trim();
    const text = q.question.trim();

    if (opp) {
      if (/\b(emblem|cross|symbol|crest|flag|badge|insignia|star|wings|artifact|relic|wand|sword|shield|chalice|grail|crown|ring|tome|book|potion|amulet|crystal|orb|weapon)\b/i.test(opp)) {
        symbols.push(opp);
      } else if (/\b(avatar)\b/i.test(opp)) {
        characters.push(opp);
      } else if (/\b(creature|beast|dragon|monster|animal|dog|cat|bird|dove|owl|phoenix|horse|lion|tiger|wolf|snake|bear|dinosaur|pet|companion|griffin|gryphon|unicorn|pegasus)\b/i.test(opp)) {
        creatures.push(opp);
      } else if (/\b(portrait|face|close-up|person|leader|hero|jesus|christ|king|queen|scientist)\b/i.test(opp)) {
        portraits.push(opp);
      } else if (/\b(sunset|landscape|mountain|sea|ocean|battle|building|temple|tomb|sky|space|castle|fortress|palace|forest|realm|island|dungeon|city|ruins|valley)\b/i.test(opp)) {
        scenes.push(opp);
      } else {
        characters.push(opp);
      }
    } else if (text) {
      if (/\b(creature|animal|dragon|dinosaur|bird|beast|pet)\b/i.test(text)) {
        creatures.push(text);
      } else if (/\b(who|character|person|jesus|hero)\b/i.test(text)) {
        portraits.push(text);
      } else if (/\b(where|place|city|temple|ocean|mountain|castle)\b/i.test(text)) {
        scenes.push(text);
      }
    }
  }

  return { symbols, portraits, scenes, creatures, characters };
}

/**
 * Deterministically derives 4 balanced, topic-centric showcase items for Segment 1 (Topic Bridge).
 * 
 * Layout composition:
 * - Slot 1: Iconic Emblem / Artifact (Inanimate relic or crest)
 * - Slot 2: Hero Portrait (Protagonist card)
 * - Slot 3: Narrative / Scenic Realm Card (Landscape vista, no character closeups)
 * - Slot 4: Mythical Creature / Animal Companion (Strictly non-human creature)
 */
export function extractBridgeShowcaseItems(
  quiz: QuizV2,
  options?: { bridgeConfig?: BridgeSceneConfig; visualStyle?: string },
): BridgeShowcaseItem[] {
  // If explicitly authored in bridge config, use existing configured items
  if (options?.bridgeConfig?.showcaseItems && options.bridgeConfig.showcaseItems.length === 4) {
    return options.bridgeConfig.showcaseItems;
  }

  const topicTitle = cleanTopicTitle(
    (quiz as { topic?: { title?: string } }).topic?.title ||
    quiz.questions[0]?.question ||
    "Quiz Challenge",
  );

  const clues = extractQuestionVisualClues(quiz);

  // Slot 1: Emblem / Sacred Artifact / Inanimate Relic
  const symbolSubject =
    clues.symbols[0] ||
    `Iconic emblem and golden sacred symbol of ${topicTitle}`;

  // Slot 2: Hero Character Portrait
  const portraitSubject =
    clues.portraits[0] ||
    (clues.characters[0] && !isSimilarSubject(clues.characters[0], symbolSubject) ? clues.characters[0] : null) ||
    `Cinematic portrait of key figure related to ${topicTitle}`;

  // Slot 3: Scenic Event / Majestic Realm (Must not duplicate Slot 1 or Slot 2)
  const sceneSubject =
    clues.scenes.find((s) => !isSimilarSubject(s, symbolSubject) && !isSimilarSubject(s, portraitSubject)) ||
    clues.scenes[0] ||
    `Dramatic atmospheric landscape and historic setting of ${topicTitle}`;

  // Slot 4: Mythical Creature, Beast, or Distinct Secondary Subject (Guaranteed not to duplicate Slot 2)
  const candidateCharacter = clues.characters.find(
    (c) => c.toLowerCase().trim() !== portraitSubject.toLowerCase().trim() && !isSimilarSubject(c, portraitSubject),
  ) || clues.characters.find(
    (c) => c.toLowerCase().trim() !== portraitSubject.toLowerCase().trim(),
  );

  const avatarSubject =
    clues.creatures[0] ||
    candidateCharacter ||
    `Distinct character avatar, mythical creature, or fantasy companion related to ${topicTitle}`;

  const isCreature = Boolean(clues.creatures.length && avatarSubject === clues.creatures[0]);
  const isAvatar = Boolean(candidateCharacter && avatarSubject === candidateCharacter);

  const items: BridgeShowcaseItem[] = [
    {
      asset_id: "asset-bridge-item-1",
      subject: symbolSubject,
      presentation: "die_cut_sticker",
      rotation_deg: -2,
      transparent_background: true,
      caption: clues.symbols.length ? "Symbol" : "Artifact",
    },
    {
      asset_id: "asset-bridge-item-2",
      subject: portraitSubject,
      presentation: "photo_card",
      rotation_deg: 1.5,
      transparent_background: false,
      caption: "Portrait",
    },
    {
      asset_id: "asset-bridge-item-3",
      subject: sceneSubject,
      presentation: "photo_card",
      rotation_deg: -3,
      transparent_background: false,
      caption: "Scene",
    },
    {
      asset_id: "asset-bridge-item-4",
      subject: avatarSubject,
      presentation: "die_cut_sticker",
      rotation_deg: 2.5,
      transparent_background: true,
      caption: isCreature ? "Creature" : isAvatar ? "Avatar" : "Creature",
    },
  ];

  return items;
}

/**
 * Builds an LLM prompt to author 4 topic-specific showcase items.
 */
export function buildBridgeShowcaseLlmPrompt(quiz: QuizV2): string {
  const topicTitle = cleanTopicTitle(
    (quiz as { topic?: { title?: string } }).topic?.title ||
    quiz.questions[0]?.question ||
    "Quiz Challenge",
  );

  const questionSummaries = quiz.questions
    .slice(0, 6)
    .map((q, idx) => `Q${idx + 1}: ${q.question} (${q.choices.map((c) => c.text).join(", ")})`)
    .join("\n");

  return [
    `You are the visual art director for a top-tier educational quiz video.`,
    `Author exactly 4 iconic visual items for the Segment 1 (Topic Bridge) bottom showcase row for the topic: "${topicTitle}".`,
    ``,
    `Quiz Context:`,
    questionSummaries,
    ``,
    `Requirements (CRITICAL DIVERSITY RULE: All 4 items MUST represent 4 COMPLETELY DIFFERENT entity categories. Absolutely NO duplicate characters or near-identical subjects):`,
    `- Item 1: Emblem or Iconic Symbol / Sacred Artifact (An inanimate magical object, relic, crest, or weapon; NOT a person or character) (presentation: "die_cut_sticker", transparent_background: true, rotation_deg: -2, caption: "Artifact" or "Symbol")`,
    `- Item 2: Hero Character Portrait (The primary protagonist or key central figure) (presentation: "photo_card", transparent_background: false, rotation_deg: 1.5, caption: "Portrait")`,
    `- Item 3: Narrative Scene, Majestic Realm, or Landmark (Panoramic landscape, castle, architecture, or setting with NO close-up characters) (presentation: "photo_card", transparent_background: false, rotation_deg: -3, caption: "Scene")`,
    `- Item 4: Mythical Creature, Magical Beast, or Distinct Companion (Strictly a non-human animal, mythical beast, or creature; DO NOT repeat the hero or any character from Item 2) (presentation: "die_cut_sticker", transparent_background: true, rotation_deg: 2.5, caption: "Creature" or "Avatar")`,
    ``,
    `DIVERSITY RULE: All 4 items must be visually and conceptually unique. Absolutely DO NOT generate multiple items of the same character, student, or person.`,
    ``,
    `Return ONLY a valid JSON array of 4 objects matching this schema with NO markdown wrapping:`,
    `[`,
    `  {`,
    `    "asset_id": "asset-bridge-item-1",`,
    `    "subject": "Clear 1-sentence prompt describing the inanimate emblem or artifact with distinctive attributes",`,
    `    "presentation": "die_cut_sticker",`,
    `    "rotation_deg": -2,`,
    `    "transparent_background": true,`,
    `    "caption": "Symbol"`,
    `  },`,
    `  ...`,
    `]`,
  ].join("\n");
}

/**
 * Safely parses LLM JSON output for the 4 showcase items, falling back to deterministic items on parse failure.
 */
export function parseBridgeShowcaseLlmOutput(
  rawOutput: string,
  fallbackItems: BridgeShowcaseItem[],
): BridgeShowcaseItem[] {
  try {
    const cleaned = rawOutput
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length !== 4) {
      return fallbackItems;
    }

    const validated: BridgeShowcaseItem[] = [];
    for (let i = 0; i < 4; i++) {
      const candidate = parsed[i];
      const result = BridgeShowcaseItemSchema.safeParse({
        ...candidate,
        asset_id: `asset-bridge-item-${i + 1}`,
      });
      if (!result.success) {
        return fallbackItems;
      }
      validated.push(result.data);
    }

    return validated;
  } catch {
    return fallbackItems;
  }
}
