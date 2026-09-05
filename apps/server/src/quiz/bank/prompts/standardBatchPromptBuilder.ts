import type { BankGameplayArchetypeId } from "@studio/shared";
import { ARCHETYPE_GUIDELINES } from "./archetypePromptGuidelines.js";

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
    ...(options.archetypeId === "versus_faceoff"
      ? [
          `=== GOLDEN VERSUS FACEOFF PARADIGMS (TOP ENGAGEMENT EXAMPLES) ===`,
          `Study these 4 canonical comparison styles (under 65 chars, NO redundant choice suffixes):`,
          `1. Comparative showdown: "Cheetah vs Falcon: Which reaches higher top speed?" -> Choices: [A: Falcon (Correct), B: Cheetah].`,
          `2. Direct superlative: "Who has the stronger bite force: Grizzly Bear or Lion?" -> Choices: [A: Grizzly Bear (Correct), B: Lion].`,
          `3. Contextual rule inquiry: "In which table sport is spinning rods strictly forbidden?" -> Choices: [A: Foosball (Correct), B: Air Hockey].`,
          `4. Unique differentiator: "Which game features a doubling cube?" -> Choices: [A: Backgammon (Correct), B: Chess].`,
          ``,
        ]
      : []),
    ...(options.archetypeId === "visual_spotting"
      ? [
          `=== GOLDEN VISUAL SPOTTING PARADIGMS (ANTI-REPETITION EXAMPLES) ===`,
          `Study these 4 varied spotting hooks (NEVER repeat "is the odd one out" across the batch):`,
          `1. Impostor alert: "Spot the impostor: Which Norse goddess does not belong?"`,
          `2. Group mismatch: "One of these Greek voyagers doesn't fit — can you spot it?"`,
          `3. Outlier challenge: "Which of these three mythical relics is the outlier?"`,
          `4. Exception finder: "Find the exception among these ancient champions!"`,
          ``,
        ]
      : []),
    ...(options.archetypeId === "clue_deduction"
      ? [
          `=== GOLDEN CLUE DEDUCTION PARADIGMS (DETECTIVE RIDDLE EXAMPLES) ===`,
          `Study these 4 deductive clue styles (DO NOT use dry "Which [adjective] [noun]..." trivia):`,
          `1. Artifact ownership: "Who is famous for wielding a nine-toothed iron rake?" -> [A: Zhu Bajie (Correct), B: Sun Wukong, C: Sha Wujing]`,
          `2. Clue pointer: "This riddle about a raven and a desk points to which host?" -> [A: Mad Hatter (Correct), B: March Hare, C: Cheshire Cat]`,
          `3. Detective inquiry: "Can you deduce the jungle child raised by wolves?" -> [A: Mowgli (Correct), B: Tarzan, C: Peter Pan]`,
          `4. Signature trail: "Demons sought immortality from which holy monk's flesh?" -> [A: Tang Sanzang (Correct), B: Xuanzang, C: Bodhidharma]`,
          ``,
        ]
      : []),
    ...(options.archetypeId === "mystery_reveal"
      ? [
          `=== GOLDEN MYSTERY REVEAL PARADIGMS (SILHOUETTE SUSPENSE EXAMPLES) ===`,
          `Study these 4 mystery reveal framing styles:`,
          `1. Stat riddle: "Sees 16 sunrises every day — what orbiting lab is this?" -> [A: ISS (Correct), B: Mir, C: Tiangong]`,
          `2. Scanner teaser: "Behind the scan: Name the rover vaporizing Martian rocks!" -> [A: Curiosity (Correct), B: Spirit, C: Opportunity]`,
          `3. Deep space milestone: "What robotic explorer carried Earth's Golden Record?" -> [A: Voyager 1 (Correct), B: Pioneer 10, C: New Horizons]`,
          `4. Silhouette outline: "Can you identify this lunar buggy with wire mesh wheels?" -> [A: Apollo Lunar Rover (Correct), B: Lunokhod 1, C: Yutu]`,
          ``,
        ]
      : []),
    ...(options.archetypeId === "visual_identification"
      ? [
          `=== GOLDEN VISUAL IDENTIFICATION PARADIGMS (RECOGNITION EXAMPLES) ===`,
          `Study these 4 visual identification styles:`,
          `1. Phenomenon naming: "What do astronomers call the point of no return around a black hole?" -> [A: Event Horizon (Correct), B: Ergosphere, C: Accretion Disk]`,
          `2. Clue teaser: "Smelled like gunpowder to Apollo astronauts — what is this dust?" -> [A: Lunar Regolith (Correct), B: Basalt Ash, C: Cosmic Silt]`,
          `3. Cosmic feature: "Can you recognize the supermassive black hole at our galactic core?" -> [A: Sagittarius A* (Correct), B: Cygnus X-1, C: M87*]`,
          `4. Solar phenomenon: "What glowing loop of magnetic plasma arches off the Sun?" -> [A: Solar Prominence (Correct), B: Solar Flare, C: Coronal Loop]`,
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
