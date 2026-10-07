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
 * Extracts candidate visual phrases and key entities from quiz questions.
 */
function extractQuestionVisualClues(quiz: QuizV2): {
  symbols: string[];
  portraits: string[];
  scenes: string[];
  characters: string[];
} {
  const symbols: string[] = [];
  const portraits: string[] = [];
  const scenes: string[] = [];
  const characters: string[] = [];

  for (const q of quiz.questions) {
    const opp = q.visual_opportunity?.trim();
    const text = q.question.trim();

    if (opp) {
      if (/\b(emblem|cross|symbol|crest|flag|badge|insignia|star|wings)\b/i.test(opp)) {
        symbols.push(opp);
      } else if (/\b(portrait|face|close-up|person|leader|hero|jesus|christ|king|queen|scientist)\b/i.test(opp)) {
        portraits.push(opp);
      } else if (/\b(sunset|landscape|mountain|sea|ocean|battle|building|temple|tomb|sky|space)\b/i.test(opp)) {
        scenes.push(opp);
      } else {
        characters.push(opp);
      }
    } else if (text) {
      if (/\b(who|character|person|jesus|hero)\b/i.test(text)) {
        portraits.push(text);
      } else if (/\b(where|place|city|temple|ocean|mountain)\b/i.test(text)) {
        scenes.push(text);
      }
    }
  }

  return { symbols, portraits, scenes, characters };
}

/**
 * Deterministically derives 4 balanced, topic-centric showcase items for Segment 1 (Topic Bridge).
 * 
 * Layout composition:
 * - Slot 1: Iconic Emblem / Symbol (Die-cut sticker with clean silhouette)
 * - Slot 2: Hero Portrait / Landmark Card (Framed photo card)
 * - Slot 3: Narrative / Scenic Event Card (Framed photo card)
 * - Slot 4: Character Avatar / Emblem Sticker (Die-cut sticker)
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

  // Slot 1: Emblem / Symbol Sticker
  const symbolSubject =
    clues.symbols[0] ||
    `Iconic emblem and golden sacred symbol of ${topicTitle}`;

  // Slot 2: Hero Portrait Card
  const portraitSubject =
    clues.portraits[0] ||
    `Cinematic portrait of key figure related to ${topicTitle}`;

  // Slot 3: Scenic Event Card
  const sceneSubject =
    clues.scenes[0] ||
    `Dramatic atmospheric landscape and historic setting of ${topicTitle}`;

  // Slot 4: Character Avatar Sticker
  const avatarSubject =
    clues.characters[0] ||
    `Vibrant character avatar and stylized figure of ${topicTitle}`;

  const items: BridgeShowcaseItem[] = [
    {
      asset_id: "asset-bridge-item-1",
      subject: symbolSubject,
      presentation: "die_cut_sticker",
      rotation_deg: -2,
      transparent_background: true,
      caption: "Symbol",
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
      caption: "Avatar",
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
    `Requirements:`,
    `- Item 1: Emblem or Iconic Symbol (presentation: "die_cut_sticker", transparent_background: true, rotation_deg: -2)`,
    `- Item 2: Hero Character Portrait or Landmark (presentation: "photo_card", transparent_background: false, rotation_deg: 1.5)`,
    `- Item 3: Narrative Scene or Landmark Event (presentation: "photo_card", transparent_background: false, rotation_deg: -3)`,
    `- Item 4: Character Avatar or Secondary Symbol (presentation: "die_cut_sticker", transparent_background: true, rotation_deg: 2.5)`,
    ``,
    `Return ONLY a valid JSON array of 4 objects matching this schema with NO markdown wrapping:`,
    `[`,
    `  {`,
    `    "asset_id": "asset-bridge-item-1",`,
    `    "subject": "Clear 1-sentence prompt describing the emblem with distinctive attributes",`,
    `    "presentation": "die_cut_sticker",`,
    `    "rotation_deg": -2,`,
    `    "transparent_background": true,`,
    `    "caption": "Short 1-2 word label"`,
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
