import type { BankGameplayArchetypeId } from "@studio/shared";
import { ARCHETYPE_GUIDELINES } from "./archetypePromptGuidelines.js";

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

export interface BuildReverseBatchPromptOptions {
  archetypeId: BankGameplayArchetypeId;
  targets: TargetEntityForGeneration[];
  language?: string;
  difficulty?: number;
  ageBand?: "kids" | "family" | "teen" | "mature";
  existingQuestionSamples?: string[];
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
        `- True / False Claims:`,
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
    ...(options.archetypeId === "verdict_true_false" || options.archetypeId === "verdict_fact_myth"
      ? [
          `=== SPECIALIZED TRUE / FALSE ARCHETYPE DIRECTIVE ===`,
          `CRITICAL RULE: Standardized exclusively to "True" and "False" format.`,
          `1. QUESTION HOOK: Formulate a punchy factual statement or question ending with "... True or False?".`,
          `2. CHOICES: Exactly 2 choices with text strictly "True" and "False".`,
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
    ...(options.archetypeId === "versus_faceoff"
      ? [
          `=== SPECIALIZED VERSUS FACEOFF COMPARATIVE DIRECTIVE ===`,
          `CRITICAL RULES FOR 1v1 HEAD-TO-HEAD COMPARISON:`,
          `1. NO REDUNDANT CHOICE TEXT: NEVER append ': Choice A or Choice B?' or '(A or B)' to the question text! Choices A and B are rendered directly on the split-screen buttons.`,
          `2. COMPETITOR PAIRING: Set Choice A to the Target Entity name, and Choice B to a rival from Versus Rivals or Distractor Pool.`,
          `3. HIGH SYNTACTIC VARIETY: Rotate between these 4 comparison styles across the batch:`,
          `   - Comparative showdown: "[Entity A] vs [Entity B]: Which reaches higher top speed?"`,
          `   - Direct superlative: "Who has the stronger bite force: [Entity A] or [Entity B]?"`,
          `   - Contextual rule inquiry: "In which [domain/sport] is [rule or trait observed]?"`,
          `   - Unique differentiator: "Which [category] features [unique attribute]?"`,
          `4. LENGTH: Keep question strictly under 65 characters so it renders crisply above the split cards without text clipping.`,
          ``,
        ]
      : []),
    ...(options.archetypeId === "visual_spotting"
      ? [
          `=== SPECIALIZED VISUAL SPOTTING OUTLIER DIRECTIVE ===`,
          `CRITICAL RULES FOR VISUAL SPOTTING (ODD ONE OUT):`,
          `1. ANTI-MONOTONY MANDATE: STRICTLY FORBIDDEN to end every question with "... is the odd one out?". You MUST vary question hooks across every single question.`,
          `2. HOOK VARIETY ROTATION: Rotate between these 5 distinct spotting formulations:`,
          `   - Impostor alert: "Spot the impostor: Which [category] does not belong?"`,
          `   - Group mismatch: "One of these [category] doesn't fit — can you spot it?"`,
          `   - Outlier challenge: "Which of these three [subjects] is the outlier?"`,
          `   - Exception finder: "Find the exception among these [subjects]!"`,
          `   - Intruder detection: "Two share [common trait], one does not — spot the mismatch!"`,
          `3. ANCHORING: The correct choice is the anomaly/outlier, while the 2 distractors share a common theme/trait from the entity's domain.`,
          ``,
        ]
      : []),
    ...(options.archetypeId === "clue_deduction"
      ? [
          `=== SPECIALIZED CLUE DEDUCTION DIRECTIVE ===`,
          `CRITICAL RULES FOR DETECTIVE CLUE DEDUCTION:`,
          `1. DEDUCTIVE REASONING OVER DRY FACTS: DO NOT phrase questions as passive biographical trivia ('Which [adjective] [person] [did something]?'). Frame them as active mystery solving where the viewer deduces the answer from Clue Image A.`,
          `2. DEDUCTION HOOK ROTATION: Rotate across these 5 phrasing patterns:`,
          `   - Clue pointer: "This clue points directly to which legendary figure?"`,
          `   - Artifact ownership: "Who is famous for wielding this [weapon / artifact / symbol]?"`,
          `   - Detective deduction: "Can you deduce the [character / profession] from this single clue?"`,
          `   - Trail puzzle: "Match the clue: Which [hero / figure] [legendary feat]?"`,
          `   - Signature legend: "Whose signature legend revolves around this [item / creature]?"`,
          `3. ANCHORING: Use the entity's Core Traits as the mystery clue that points decisively to the entity.`,
          ``,
        ]
      : []),
    ...(options.archetypeId === "mystery_reveal"
      ? [
          `=== SPECIALIZED MYSTERY REVEAL DIRECTIVE ===`,
          `CRITICAL RULES FOR SILHOUETTE & SCANNER REVEAL:`,
          `1. SUSPENSE & SILHOUETTE FRAMING: DO NOT use repetitive 'Which [adjective] [noun] [verb]?' templates. Frame each question around a hidden contour, outline, or dramatic reveal.`,
          `2. REVEAL HOOK ROTATION: Rotate across these 5 phrasing patterns:`,
          `   - Silhouette guess: "Can you guess this [craft / creature] from its silhouette?"`,
          `   - Scanner teaser: "Behind the scan beam: Name the [machine / explorer] that [action]!"`,
          `   - Stat riddle: "[Surprising stat/milestone] — what [vehicle / subject] is hiding here?"`,
          `   - Shadow identification: "Whose outline is concealed in this mystery reveal?"`,
          `   - Unmasking challenge: "Unmask the legend: Which [craft / figure] [historic achievement]?"`,
          `3. ANCHORING: Base the visual silhouette description in visual_spec on the entity's iconic visual_anchor.`,
          ``,
        ]
      : []),
    ...(options.archetypeId === "visual_identification"
      ? [
          `=== SPECIALIZED VISUAL IDENTIFICATION DIRECTIVE ===`,
          `CRITICAL RULES FOR VISUAL IDENTIFICATION:`,
          `1. SYNTACTIC DIVERSITY: DO NOT start every question with 'What [adjective] [noun]...' or 'Which [noun]...'. Vary the grammatical opening continuously.`,
          `2. RECOGNITION HOOK ROTATION: Rotate across these 5 phrasing patterns:`,
          `   - Phenomenon naming: "What do [scientists / astronomers / historians] call this [phenomenon]?"`,
          `   - Direct recognition: "Can you identify this [creature / landmark / structure]?"`,
          `   - Clue teaser: "Known for [surprising trait] — what is this [object / structure]?"`,
          `   - Category locator: "Which [feature / structure] anchors [specific location or system]?"`,
          `   - Feature detective: "Identify this [subject] from its distinctive [physical attribute]."`,
          `3. ANCHORING: Focus on the entity's visual_anchor and distinctive physical traits.`,
          ``,
        ]
      : []),
    `=== REVERSE MATRIX GENERATION CONTRACT (STRICT) ===`,
    `1. 1-to-1 MAPPING: Generate exactly ${options.targets.length} questions, in the exact order of the Target Entities.`,
    `2. ENTITY ANCHOR: For each question, set "entity_id" to the corresponding Entity ID.`,
    options.archetypeId === "speed_blitz"
      ? `3. TRICK / RIDDLE ANCHOR: Craft a fast-reflex brainteaser or cognitive trap situated around the entity (its traits, behavior, or physical nature).`
      : `3. TRUTH & ACCURACY: Base the question directly on the provided Core Traits, True / False Claims, or Versus Rivals. Do NOT hallucinate facts.`,
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
