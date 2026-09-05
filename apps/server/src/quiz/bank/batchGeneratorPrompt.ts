import { BankQuestionSchema, type BankGameplayArchetypeId, type BankQuestion } from "@studio/shared";

export interface ArchetypePromptGuideline {
  format: "multiple_choice" | "true_false" | "odd_one_out" | "open_guess" | "slider" | "ordering";
  choiceCount: number;
  visualIntent: "none" | "question_illustration" | "choice_illustration";
  defaultThinkingSeconds: number;
  instructions: string[];
}

export const ARCHETYPE_GUIDELINES: Record<BankGameplayArchetypeId, ArchetypePromptGuideline> = {
  verdict_fact_myth: {
    format: "true_false",
    choiceCount: 2,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 5,
    instructions: [
      "Fact or Myth style statement. Must be punchy, single-clause, and strictly under 65 characters.",
      "Format: Direct statement or question ending in 'Fact or Myth?' (e.g. 'Are blue whales bigger than any dinosaur? Fact or Myth?').",
      "Do NOT cram numbers, secondary clauses, or explanations into the question text.",
      "Exactly 2 choices: True and False (or Fact and Myth).",
      "Provide a clear explanation of why it is true or false along with a scientific/real-world fun fact.",
      "Visual prompt describes a realistic, cinematic background scene illustrating the statement.",
    ],
  },
  speed_blitz: {
    format: "multiple_choice",
    choiceCount: 3,
    visualIntent: "none",
    defaultThinkingSeconds: 4,
    instructions: [
      "Rapid reflex riddle, mental math, or trick question under 70 characters designed for fast thinking (3-5 seconds).",
      "Concise, punchy wording targeting intuitive cognitive traps.",
      "3 choices (A, B, C), where wrong choices represent common psychological misconceptions.",
      "Visual spec intent is 'none' so viewers focus purely on text and reflexes.",
    ],
  },
  deep_trivia: {
    format: "multiple_choice",
    choiceCount: 4,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 6,
    instructions: [
      "Deep knowledge trivia question under 75 characters (history, cosmos, rare animals, breakthrough science).",
      "4 choices (A, B, C, D) with high plausibility to stimulate curiosity.",
      "Engaging, educational explanation revealing an angle that 95% of viewers don't know.",
      "Visual prompt describes a breathtaking cinematic environment or subject.",
    ],
  },
  versus_faceoff: {
    format: "multiple_choice",
    choiceCount: 2,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 5,
    instructions: [
      "1v1 direct head-to-head comparison under 60 characters (A vs B): 'Who is faster: Cheetah or Falcon?'.",
      "Exactly 2 choices (A and B representing the competing entities).",
      "Explanation highlights verified stats or scientific records deciding the winner.",
      "Visual spec intent is 'question_illustration' depicting both subjects in confrontation.",
    ],
  },
  visual_spotting: {
    format: "odd_one_out",
    choiceCount: 4,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 6,
    instructions: [
      "Visual spotting challenge finding anomalies, differences, or synthetic impostors in the frame.",
      "4 choices corresponding to 4 positions or distinctive traits.",
      "Visual spec describes the visual challenge in detail (camouflaged animal, AI impostor, etc.).",
    ],
  },
  visual_identification: {
    format: "multiple_choice",
    choiceCount: 3,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 5,
    instructions: [
      "Identify a creature, object, or landmark from a macro zoom or distinctive perspective.",
      "3 choices with potential candidate names.",
      "Visual spec describes macro closeup or distinctive angle.",
    ],
  },
  mystery_reveal: {
    format: "multiple_choice",
    choiceCount: 3,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 6,
    instructions: [
      "Guess the mystery object hidden behind a dark silhouette or mosaic cover.",
      "3 choices.",
      "Explanation reveals the secret story behind the silhouette.",
    ],
  },
  clue_deduction: {
    format: "multiple_choice",
    choiceCount: 3,
    visualIntent: "question_illustration",
    defaultThinkingSeconds: 7,
    instructions: [
      "Detective deduction challenge connecting clue image A to surprise reveal answer B.",
      "3 choices.",
      "Explanation connects clues clearly and persuasively.",
    ],
  },
};

export interface BuildBatchPromptOptions {
  archetypeId: BankGameplayArchetypeId;
  domainId: string;
  subtopicId: string;
  subtopicTitle?: string;
  count: number;
  language?: string;
  difficulty?: number;
  ageBand?: "kids" | "family" | "teen" | "mature";
  existingQuestionSamples?: string[];
}

export function buildBatchGenerationPrompt(options: BuildBatchPromptOptions): string {
  const guideline = ARCHETYPE_GUIDELINES[options.archetypeId] || ARCHETYPE_GUIDELINES.speed_blitz;
  const lang = options.language || "en";
  const diff = options.difficulty ?? 2;
  const ageBand = options.ageBand || "family";
  const subtopicTitle = options.subtopicTitle || options.subtopicId.replaceAll("_", " ");

  const existingSamplesBlock =
    options.existingQuestionSamples && options.existingQuestionSamples.length > 0
      ? `\n[EXISTING QUESTIONS IN BANK - DO NOT DUPLICATE]:\n` +
        options.existingQuestionSamples.map((s, idx) => `  ${idx + 1}. "${s}"`).join("\n") +
        `\n`
      : "";

  return [
    `You are a world-class Quiz & Trivia Designer for short-form video platforms (YouTube Shorts / TikTok / Reels).`,
    `Your mission is to create exactly ${options.count} unique, high-retention, engaging trivia questions.`,
    ``,
    `=== ASSIGNMENT PARAMETERS ===`,
    `- Archetype: "${options.archetypeId}"`,
    `- Domain: "${options.domainId}"`,
    `- Subtopic: "${options.subtopicId}" ("${subtopicTitle}")`,
    `- Target Difficulty: ${diff}/5`,
    `- Target Age Band: "${ageBand}"`,
    `- Language: "${lang}"`,
    ``,
    `=== ARCHETYPE SPECIFICATIONS (${options.archetypeId}) ===`,
    `- Format: "${guideline.format}"`,
    `- Choice Count: ${guideline.choiceCount}`,
    `- Thinking Duration: ${guideline.defaultThinkingSeconds} seconds`,
    `- Core Rules:`,
    ...guideline.instructions.map((ins) => `  * ${ins}`),
    ``,
    `=== MOBILE VIDEO SHORTS LENGTH & PACING RULES (STRICT) ===`,
    `1. QUESTION LENGTH: Strictly 6 to 12 words (40–75 characters max).`,
    `   - On vertical mobile screens (9:16 Shorts), the question box fits at most 2 lines without shrinking font size.`,
    `   - NEVER use compound sentences with multiple clauses (e.g. avoid "...ever known to have lived on Earth, larger than any dinosaur").`,
    `   - NEVER cram explanations, scientific units, or secondary background facts into the question.`,
    `   - Keep the question text punchy, direct, and readable in under 2 seconds.`,
    `2. AUDIENCE APPROPRIATENESS (${ageBand.toUpperCase()}):`,
    `   - Accessible, clear vocabulary tailored for ${ageBand === "kids" ? "children (ages 8-12)" : "family & general audiences"}.`,
    `   - Foster curiosity and immediate reflex guessing.`,
    `   - Reserve all rich numbers (e.g. "weighs 200 tons", "heart weighs 400 lbs") strictly for the "explanation" and "fun_fact" fields.`,
    ``,
    `=== STRICT CONTENT POLICY ===`,
    `1. NEVER use copyrighted characters or trademarked franchises:`,
    `   - No Marvel / DC superheroes (Spider-Man, Batman, Iron Man, Thor, Hulk...).`,
    `   - No Video Game characters (Pikachu, Pokemon, Mario, Sonic, Minecraft, Roblox...).`,
    `   - No Disney characters (Mickey Mouse, Donald Duck, Elsa, Lion King...).`,
    `2. DO NOT create offensive, gory, or dangerous content.`,
    existingSamplesBlock,
    `=== MANDATORY OUTPUT FORMAT ===`,
    `Return ONLY a valid JSON array containing ${options.count} question objects. NO markdown fences, NO intro, NO commentary outside the array.`,
    `JSON structure for each question:`,
    `[`,
    `  {`,
    `    "archetype_id": "${options.archetypeId}",`,
    `    "domain_id": "${options.domainId}",`,
    `    "subtopic_id": "${options.subtopicId}",`,
    `    "question": "Concise, hook-oriented question text?",`,
    `    "format": "${guideline.format}",`,
    `    "choices": [`,
    `      { "id": "A", "text": "Option A text", "is_correct": true },`,
    `      { "id": "B", "text": "Option B text", "is_correct": false }`,
    `    ],`,
    `    "correct_choice_id": "A",`,
    `    "explanation": "Concise 1-2 sentence explanation of why it is correct and the real-world context.",`,
    `    "fun_fact": "Surprising bonus fact.",`,
    `    "visual_spec": {`,
    `      "intent": "${guideline.visualIntent}",`,
    `      "prompt": "Detailed cinematic image prompt in English for AI image generator",`,
    `      "aspect_ratio": "16:9"`,
    `    },`,
    `    "age_band": "${ageBand}",`,
    `    "difficulty": ${diff},`,
    `    "thinking_seconds": ${guideline.defaultThinkingSeconds},`,
    `    "tags": ["${options.subtopicId}", "${options.archetypeId}"]`,
    `  }`,
    `]`,
  ].join("\n");
}

function makeUniqueBankId(archetypeId: string, domainId: string, subtopicId: string): string {
  const archPrefix = archetypeId.slice(0, 3).toUpperCase();
  const domPrefix = domainId.slice(0, 3).toUpperCase();
  const subPrefix = subtopicId.slice(0, 3).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${archPrefix}-${domPrefix}-${subPrefix}-${randomSuffix}`;
}

export function parseBatchGenerationOutput(
  rawOutput: string,
  meta: {
    archetypeId: BankGameplayArchetypeId;
    domainId: string;
    subtopicId: string;
    difficulty?: number;
    ageBand?: "kids" | "family" | "teen" | "mature";
  },
): BankQuestion[] {
  let cleaned = rawOutput.trim();

  // Strip markdown code fences if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  // Attempt JSON parsing
  let items: unknown;
  try {
    items = JSON.parse(cleaned);
  } catch {
    // If wrapped in an object like { questions: [...] }
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        items = JSON.parse(arrayMatch[0]);
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  if (!Array.isArray(items)) {
    if (items && typeof items === "object" && Array.isArray((items as { questions?: unknown[] }).questions)) {
      items = (items as { questions: unknown[] }).questions;
    } else {
      return [];
    }
  }

  const result: BankQuestion[] = [];
  const now = new Date().toISOString();

  for (const item of items as Record<string, unknown>[]) {
    if (!item || typeof item !== "object") continue;

    // Enforce metadata defaults
    const candidate: Record<string, unknown> = {
      ...item,
      id:
        typeof item.id === "string" && item.id.trim() ? item.id.trim() : makeUniqueBankId(meta.archetypeId, meta.domainId, meta.subtopicId),
      archetype_id: meta.archetypeId,
      domain_id: meta.domainId,
      subtopic_id: meta.subtopicId,
      status: "approved",
      difficulty: typeof item.difficulty === "number" ? item.difficulty : (meta.difficulty ?? 2),
      age_band: typeof item.age_band === "string" ? item.age_band : (meta.ageBand ?? "family"),
      created_at: now,
      updated_at: now,
    };

    if (candidate.visual_spec && typeof candidate.visual_spec === "object") {
      const vs = { ...(candidate.visual_spec as Record<string, unknown>) };
      if (vs.intent !== "choice_illustration" && vs.intent !== "none") {
        vs.intent = "question_illustration";
      }
      candidate.visual_spec = vs;
    }

    const parsed = BankQuestionSchema.safeParse(candidate);
    if (parsed.success) {
      result.push(parsed.data);
    }
  }

  return result;
}
