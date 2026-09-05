import {
  BankTranslationContentSchema,
  normalizeLanguageCode,
  getLanguageDisplayLabel,
  type BankGameplayArchetypeId,
  type BankQuestion,
  type BankTranslationContent,
} from "@studio/shared";

export interface BuildQuestionTranscreationPromptParams {
  question: BankQuestion;
  targetLanguage: string;
  channelTone?: string;
  additionalGuidelines?: string[];
}

const ARCHETYPE_TRANSCREATION_NUANCE: Record<BankGameplayArchetypeId, string> = {
  verdict_fact_myth:
    "Archetype: 'True or False' (Verdict Fact vs Myth). The question asserts a bold statement that sparks curiosity and challenges intuition, ending in 'True or False?' (or localized equivalent). Choice translations must strictly be True and False (e.g. 'True' / 'False', 'Đúng' / 'Sai', 'Verdadero' / 'Falso'). Explanations must convincingly clarify the scientific or factual reasoning.",
  speed_blitz:
    "Archetype: 'Speed Blitz'. Phrasing must be ultra-concise with a rapid, driving rhythm (3-5 second read). Preserve wit, humor, and intuitive twist of the riddle without cluttered words.",
  deep_trivia:
    "Archetype: 'Deep Trivia'. Sophisticated yet engaging tone with accurate domain terminology. The explanation should reveal a fascinating, mind-blowing perspective.",
  versus_faceoff:
    "Archetype: 'Versus Faceoff'. Dramatic head-to-head comparison between two subjects. Keep canonical naming of both subjects across choices.",
  visual_spotting:
    "Archetype: 'Visual Spotting'. Prompt viewers to inspect the visual closely to catch subtle differences or camouflaged details.",
  visual_identification:
    "Archetype: 'Visual Identification'. Hint at hallmark characteristics to prompt viewers to guess the subject's identity.",
  mystery_reveal:
    "Archetype: 'Mystery Reveal'. Build suspense and anticipation around a masked, blurred, or silhouetted image.",
  clue_deduction:
    "Archetype: 'Clue Deduction'. Preserve progressive step-by-step clues so viewers can trace the investigative thread.",
};

/**
 * Builds a deep transcreation prompt for a Question Bank question.
 */
export function buildQuestionTranscreationPrompt(params: BuildQuestionTranscreationPromptParams): string {
  const { question, targetLanguage, channelTone, additionalGuidelines } = params;
  const normLang = normalizeLanguageCode(targetLanguage);
  const langLabel = getLanguageDisplayLabel(normLang);
  const archetypeNuance = ARCHETYPE_TRANSCREATION_NUANCE[question.archetype_id] || "";

  const choicesList = question.choices
    .map((c) => `  - [ID: "${c.id}"] "${c.text}" (is_correct: ${c.id === question.correct_choice_id})`)
    .join("\n");

  const promptSections = [
    `You are an elite multilingual Localization Director and Quiz Show Content Creator specializing in viral YouTube Shorts & TikTok trivia.`,
    ``,
    `=== TASK ===`,
    `Transcreate (creative cultural translation) the following Quiz Question from its source into target language: **${langLabel} (code: "${normLang}")**.`,
    ``,
    `=== ARCHETYPE & TONE CONTEXT ===`,
    archetypeNuance,
    channelTone ? `Channel Personality / Tone: "${channelTone}"` : "",
    ``,
    `=== SOURCE QUESTION (ENGLISH / ORIGINAL) ===`,
    `ID: ${question.id}`,
    `Archetype: ${question.archetype_id}`,
    `Question Text: "${question.question}"`,
    `Format: ${question.format}`,
    `Choices:`,
    choicesList,
    `Correct Choice ID: "${question.correct_choice_id}"`,
    `Explanation: "${question.explanation}"`,
    question.fun_fact ? `Fun Fact: "${question.fun_fact}"` : "",
    ``,
    `=== STRICT TRANSCREATION INVARIANTS ===`,
    `1. TRANSCREATE, DO NOT LITERAL-TRANSLATE:`,
    `   - Translate with natural, colloquial spoken rhythm suited for rapid TTS voiceover on short-form video.`,
    `   - Convert imperial measurements to metric units where appropriate for the target culture (e.g. miles -> km, lbs -> kg, Fahrenheit -> Celsius).`,
    `   - Preserve punchy humor, wordplay, and suspense.`,
    `2. ABSOLUTE PRESERVATION OF CHOICES & LOGIC:`,
    `   - You MUST keep the EXACT same choice IDs (${question.choices.map((c) => `"${c.id}"`).join(", ")}). Do not alter or omit IDs.`,
    `   - The choice corresponding to ID "${question.correct_choice_id}" MUST REMAIN the unambiguously correct answer!`,
    `   - Translate choice texts accurately so the distinction between correct and incorrect remains 100% true.`,
    `3. VISUAL SPECIFICATION:`,
    `   - Do NOT translate visual prompt keywords. Visual spec remains purely in English in the source data.`,
    ...(additionalGuidelines && additionalGuidelines.length > 0
      ? [`=== ADDITIONAL GUIDELINES ===`, ...additionalGuidelines.map((g) => `- ${g}`)]
      : []),
    ``,
    `=== REQUIRED OUTPUT FORMAT ===`,
    `Return ONLY a raw, valid JSON object with no preamble, no commentary, and no markdown wrapping outside the JSON.`,
    `Exact JSON Schema:`,
    `{`,
    `  "language": "${normLang}",`,
    `  "question": "<Transcreated question string in ${normLang}>",`,
    `  "choices": [`,
    question.choices.map((c) => `    { "id": "${c.id}", "text": "<Transcreated text for choice ${c.id}>" }`).join(",\n"),
    `  ],`,
    `  "explanation": "<Transcreated explanation string in ${normLang}>",`,
    `  "fun_fact": "<Transcreated fun fact string in ${normLang}>",`,
    `  "verified": true`,
    `}`,
  ];

  return promptSections.filter((line) => line !== undefined).join("\n");
}

/**
 * Parses and verifies AI JSON output to ensure compliance with BankTranslationContentSchema.
 */
export function parseTranscreationOutput(
  rawOutput: string,
  sourceQuestion?: BankQuestion,
): BankTranslationContent {
  let cleaned = rawOutput.trim();

  // 1. Strip markdown code fences if wrapped
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  // 2. Extract JSON object
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    cleaned = objectMatch[0].trim();
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Failed to parse transcreation JSON output: ${err instanceof Error ? err.message : String(err)}. Raw output was: ${rawOutput.slice(0, 200)}`,
    );
  }

  // 3. Schema validation with Zod
  const validation = BankTranslationContentSchema.safeParse(parsedJson);
  if (!validation.success) {
    const errorDetails = validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Transcreation output failed schema validation: ${errorDetails}`);
  }

  const result = validation.data;

  // 4. Invariant checks against source question (if provided)
  if (sourceQuestion) {
    if (result.choices.length !== sourceQuestion.choices.length) {
      throw new Error(
        `Transcreated choice count mismatch: expected ${sourceQuestion.choices.length}, got ${result.choices.length}`,
      );
    }

    const sourceChoiceIdsLower = sourceQuestion.choices.map((c) => c.id.trim().toLowerCase());
    const resultChoiceIdsLower = result.choices.map((c) => c.id.trim().toLowerCase());
    const resultSet = new Set(resultChoiceIdsLower);

    for (const expectedIdLower of sourceChoiceIdsLower) {
      if (!resultSet.has(expectedIdLower)) {
        throw new Error(
          `Transcreated choices missing source choice ID "${expectedIdLower}". Got: ${Array.from(resultSet).join(", ")}`,
        );
      }
    }

    // Re-align choice IDs to match sourceQuestion casing precisely
    result.choices = result.choices.map((rc, idx) => {
      const match = sourceQuestion.choices.find(
        (sc) => sc.id.trim().toLowerCase() === rc.id.trim().toLowerCase(),
      ) ?? sourceQuestion.choices[idx];
      return {
        ...rc,
        id: match ? match.id : rc.id,
      };
    });
  }

  return result;
}
