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
      "True or False format. Must be a punchy, single-clause statement or question strictly under 65 characters.",
      "Format: Direct factual or counter-factual statement ending in 'True or False?' (e.g. 'Blue whales are bigger than any dinosaur. True or False?').",
      "Do NOT cram numbers, secondary clauses, or explanations into the question text.",
      "Exactly 2 choices: 'True' and 'False' (NEVER use 'Fact' or 'Myth').",
      "Truth Balance: Maintain a strict ~50/50 balance between True and False as the correct choice across the generated questions to keep viewer suspense.",
      "Provide a clear explanation of why it is True or False along with a scientific/real-world fun fact.",
      "Visual prompt describes a realistic, cinematic background scene illustrating the statement.",
    ],
  },
  speed_blitz: {
    format: "multiple_choice",
    choiceCount: 3,
    visualIntent: "none",
    defaultThinkingSeconds: 4,
    instructions: [
      "Rapid reflex riddle, cognitive brainteaser, mental math trap, or lateral wordplay strictly under 70 characters for 3-4s fast thinking.",
      "DO NOT ask dry encyclopedic facts, historical dates, or textbook definitions.",
      "Target instinctive cognitive traps where intuitive first-glance logic fails (rate multiplier paradoxes, linguistic illusions, object permanence/survival traps).",
      "Exactly 3 choices (A, B, C): 1 correct counter-intuitive answer and 2 seductive trap choices that 80% of viewers instinctively pick.",
      "Explanation must clearly reveal the witty 'Aha!' logic in 1-2 punchy sentences.",
      "Visual spec intent is 'none' (pure text focus for maximum speed and reading reflex).",
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

export interface TargetEntityForGeneration {
  entity_id: string;
  name: string;
  domain_id: string;
  subtopic_id: string;
  visual_anchor: string;
  core_traits: string[];
  distractor_pool?: string[];
  facts_and_myths: Array<{
    claim: string;
    verdict: "fact" | "myth" | "true" | "false";
    explanation: string;
    fun_fact?: string;
  }>;
  versus_candidates?: string[];
}

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

export interface BuildReverseBatchPromptOptions {
  archetypeId: BankGameplayArchetypeId;
  targets: TargetEntityForGeneration[];
  language?: string;
  difficulty?: number;
  ageBand?: "kids" | "family" | "teen" | "mature";
  existingQuestionSamples?: string[];
}

/**
 * Standard topic-based batch generation prompt (legacy / open mode).
 */
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
    ...(options.archetypeId === "speed_blitz"
      ? [
          `=== GOLDEN SPEED BLITZ PARADIGMS (TOP ENGAGEMENT EXAMPLES) ===`,
          `Study these 4 canonical archetypes of high-retention 4-second brainteasers:`,
          `1. Geometric Paradox: "A wooden stick has 2 ends. How many ends does half a stick have?" -> Choices: [A: 1 end, B: 2 ends (Correct), C: 0 ends]. Explanation: "When you break a stick in half, the broken piece still has 2 ends!"`,
          `2. Shared Attribute Trap: "A family has 6 sons, each with 1 sister. How many kids total?" -> Choices: [A: 7 children (Correct), B: 12 children, C: 6 children]. Explanation: "All 6 brothers share the exact same sister, making 7 children total!"`,
          `3. Lateral / Linguistic Trap: "A man walks in the rain with no umbrella, yet no hair gets wet. Why?" -> Choices: [A: He is bald (Correct), B: He ran fast, C: The rain stopped]. Explanation: "The man is completely bald, so he has no hair to get wet!"`,
          `4. Overtake Reflex Trap: "You pass the person in second place in a race. What place are you?" -> Choices: [A: 1st place, B: 2nd place (Correct), C: 3rd place]. Explanation: "By overtaking 2nd place, you take their spot in 2nd place!"`,
          ``,
        ]
      : []),
    `=== MOBILE VIDEO SHORTS LENGTH & PACING RULES (STRICT) ===`,
    `1. QUESTION LENGTH: Strictly 6 to 12 words (40–75 characters max).`,
    `   - On vertical mobile screens (9:16 Shorts), the question box fits at most 2 lines without shrinking font size.`,
    `   - NEVER use compound sentences with multiple clauses.`,
    `   - NEVER cram explanations, scientific units, or secondary background facts into the question.`,
    `   - Keep the question text punchy, direct, and readable in under 2 seconds.`,
    `2. AUDIENCE APPROPRIATENESS (${ageBand.toUpperCase()}):`,
    `   - Accessible, clear vocabulary tailored for ${ageBand === "kids" ? "children (ages 8-12)" : "family & general audiences"}.`,
    `   - Foster curiosity and immediate reflex guessing.`,
    `   - Reserve all rich numbers strictly for the "explanation" and "fun_fact" fields.`,
    ``,
    `=== STRICT CONTENT POLICY ===`,
    `1. NEVER use copyrighted characters or trademarked franchises (No Marvel, DC, Pokemon, Disney, etc.).`,
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

/**
 * Deterministic Reverse Matrix prompt builder:
 * Injects concrete Knowledge Base entities and instructs the LLM to create questions anchored to each entity.
 */
export function buildReverseGenerationPrompt(options: BuildReverseBatchPromptOptions): string {
  const guideline = ARCHETYPE_GUIDELINES[options.archetypeId] || ARCHETYPE_GUIDELINES.speed_blitz;
  const lang = options.language || "en";
  const diff = options.difficulty ?? 2;
  const ageBand = options.ageBand || "family";

  const targetEntitiesBlock = options.targets
    .map((target, idx) => {
      const traits = target.core_traits.slice(0, 4).join(" | ");
      const distractors = target.distractor_pool?.slice(0, 4).join(", ") || "None specified";
      const facts = target.facts_and_myths
        .slice(0, 2)
        .map((f) => {
          const isTrue = f.verdict.toLowerCase() === "fact" || f.verdict.toLowerCase() === "true";
          const label = isTrue ? "TRUE" : "FALSE";
          return `  * [${label}] "${f.claim}" -> ${f.explanation}`;
        })
        .join("\n");
      const rivals = target.versus_candidates?.slice(0, 3).join(", ") || "None specified";

      return [
        `[Target Entity #${idx + 1}]`,
        `- Entity ID: "${target.entity_id}"`,
        `- Canonical Name: "${target.name}"`,
        `- Domain: "${target.domain_id}", Subtopic: "${target.subtopic_id}"`,
        `- Core Traits / Clues: ${traits}`,
        `- Distractor Pool: ${distractors}`,
        `- Versus Rivals: ${rivals}`,
        `- Facts & Myths:`,
        facts || "  (None)",
      ].join("\n");
    })
    .join("\n\n");

  const existingSamplesBlock =
    options.existingQuestionSamples && options.existingQuestionSamples.length > 0
      ? `\n[EXISTING QUESTIONS IN BANK - DO NOT DUPLICATE]:\n` +
        options.existingQuestionSamples.map((s, idx) => `  ${idx + 1}. "${s}"`).join("\n") +
        `\n`
      : "";

  return [
    `You are an elite Quiz Architect creating high-retention video trivia for YouTube Shorts & TikTok.`,
    `Your task is to generate exactly ${options.targets.length} questions, strictly mapping 1-to-1 to each target entity provided below.`,
    ``,
    `=== ASSIGNMENT PARAMETERS ===`,
    `- Gameplay Archetype: "${options.archetypeId}"`,
    `- Format: "${guideline.format}"`,
    `- Choice Count: ${guideline.choiceCount}`,
    `- Default Thinking Seconds: ${guideline.defaultThinkingSeconds}`,
    `- Target Difficulty: ${diff}/5`,
    `- Target Age Band: "${ageBand}"`,
    `- Target Language: "${lang}"`,
    ``,
    `=== TARGET ENTITIES (EXACTLY 1 QUESTION PER ENTITY) ===`,
    targetEntitiesBlock,
    ``,
    `=== ARCHETYPE RULES FOR "${options.archetypeId}" ===`,
    ...guideline.instructions.map((ins) => `* ${ins}`),
    ``,
    ...(options.archetypeId === "verdict_fact_myth"
      ? [
          `=== SPECIALIZED TRUE / FALSE ARCHETYPE DIRECTIVE ===`,
          `CRITICAL RULE: Standardized exclusively to "True" and "False" format.`,
          `1. QUESTION HOOK: Formulate a punchy factual statement or question ending with "... True or False?".`,
          `2. CHOICES: Exactly 2 choices with text strictly "True" and "False" (NEVER use "Fact" or "Myth").`,
          `3. TRUTH BALANCE: Enforce a strict ~50/50 distribution across questions (roughly half True, half False as correct choice).`,
          `4. ANCHORING: Map [TRUE] claims from the target entity to correct choice "True", and [FALSE] claims to correct choice "False".`,
          ``,
        ]
      : []),
    ...(options.archetypeId === "speed_blitz"
      ? [
          `=== SPECIALIZED SPEED BLITZ COGNITIVE TRAP DIRECTIVE ===`,
          `CRITICAL RULE: DO NOT ask dry factual trivia or textbook knowledge about the entity.`,
          `Instead, use each Target Entity as the SITUATIONAL CONTEXT for a fast-reflex brainteaser or cognitive trap under 70 characters:`,
          `- Rate / Multiplier Paradox: "If 2 [entities] take 2 min to catch 2 prey, how long do 100 [entities] take to catch 100?" -> 2 min (not 100 min).`,
          `- Survival / Permanence Trap: "There are 10 [entities], 3 leave/fall/stop. How many remain?" -> Focus on physical permanence.`,
          `- Linguistic & Boundary Trap: "A [entity/vehicle] has an event on a border. Where are survivors buried?" -> Nowhere (survivors aren't buried!).`,
          `- Interval & Counting Paradox: "A [clock/bell] strikes 6 in 5s. How many seconds to strike 12?" -> Interval count trap.`,
          `- Shared Attribute Paradox: "6 [entities] each share 1 partner/sibling. How many total?" -> 7 (not 12!).`,
          `- Geometric / Part Paradox: "A [entity/stick/rope] has 2 ends. How many ends does half have?" -> 2 ends!`,
          `- Intuitive Misconception Trap: Exploit a common reflex assumption or optical/mental illusion tied to the entity.`,
          `Ensure WRONG CHOICES represent the exact instinctive trap that human intuition falls into under a 4-second timer!`,
          ``,
        ]
      : []),
    `=== REVERSE MATRIX GENERATION CONTRACT (STRICT) ===`,
    `1. 1-to-1 MAPPING: Generate exactly ${options.targets.length} questions, in the exact order of the Target Entities.`,
    `2. ENTITY ANCHOR: For each question, set "entity_id" to the corresponding Entity ID.`,
    options.archetypeId === "speed_blitz"
      ? `3. TRICK / RIDDLE ANCHOR: Craft a fast-reflex brainteaser or cognitive trap situated around the entity (its traits, behavior, or physical nature).`
      : `3. TRUTH & ACCURACY: Base the question directly on the provided Core Traits, Facts & Myths, or Versus Rivals. Do NOT hallucinate facts.`,
    `4. DISTRACTORS: Draw plausible wrong choices from the provided Distractor Pool or Versus Rivals whenever possible.`,
    `5. CONCISE HOOK: Question text must be strictly 6 to 12 words (40-75 characters max) suited for fast mobile reading.`,
    existingSamplesBlock,
    `=== MANDATORY JSON OUTPUT FORMAT ===`,
    `Return ONLY a valid JSON array of ${options.targets.length} question objects. NO markdown, NO commentary outside the array.`,
    `Each object MUST follow:`,
    `[`,
    `  {`,
    `    "entity_id": "ENT-...",`,
    `    "archetype_id": "${options.archetypeId}",`,
    `    "domain_id": "<target domain>",`,
    `    "subtopic_id": "<target subtopic>",`,
    `    "question": "Punchy question text?",`,
    `    "format": "${guideline.format}",`,
    `    "choices": [`,
    `      { "id": "A", "text": "Option A", "is_correct": true },`,
    `      { "id": "B", "text": "Option B", "is_correct": false }`,
    `    ],`,
    `    "correct_choice_id": "A",`,
    `    "explanation": "Clear explanation of the correct answer.",`,
    `    "fun_fact": "Surprising related fact.",`,
    `    "visual_spec": {`,
    `      "intent": "${guideline.visualIntent}",`,
    `      "prompt": "Cinematic visual description in English",`,
    `      "aspect_ratio": "16:9"`,
    `    },`,
    `    "difficulty": ${diff},`,
    `    "thinking_seconds": ${guideline.defaultThinkingSeconds},`,
    `    "tags": ["<subtopic_id>", "${options.archetypeId}"]`,
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

    const candidate: Record<string, unknown> = {
      ...item,
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : makeUniqueBankId(meta.archetypeId, meta.domainId, meta.subtopicId),
      entity_id: typeof item.entity_id === "string" && item.entity_id.trim() ? item.entity_id.trim() : undefined,
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

/**
 * Parses and validates raw LLM output from reverse matrix generation, correlating questions to target entities.
 */
export function parseReverseBatchGenerationOutput(
  rawOutput: string,
  targets: TargetEntityForGeneration[],
  meta: {
    archetypeId: BankGameplayArchetypeId;
    difficulty?: number;
    ageBand?: "kids" | "family" | "teen" | "mature";
  },
): BankQuestion[] {
  let cleaned = rawOutput.trim();

  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  let items: unknown;
  try {
    items = JSON.parse(cleaned);
  } catch {
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
  const targetMap = new Map<string, TargetEntityForGeneration>();
  for (const t of targets) {
    targetMap.set(t.entity_id, t);
  }

  const rawItems = items as Record<string, unknown>[];
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    if (!item || typeof item !== "object") continue;

    // Resolve matched target entity: by entity_id first, then by index fallback
    let entityId = typeof item.entity_id === "string" ? item.entity_id.trim() : "";
    let matchedTarget = targetMap.get(entityId);

    if (!matchedTarget && i < targets.length) {
      matchedTarget = targets[i];
      entityId = matchedTarget.entity_id;
    }

    const domainId = matchedTarget ? matchedTarget.domain_id : (item.domain_id as string) || "general";
    const subtopicId = matchedTarget ? matchedTarget.subtopic_id : (item.subtopic_id as string) || "general";

    const candidate: Record<string, unknown> = {
      ...item,
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : makeUniqueBankId(meta.archetypeId, domainId, subtopicId),
      entity_id: entityId || undefined,
      archetype_id: meta.archetypeId,
      domain_id: domainId,
      subtopic_id: subtopicId,
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
