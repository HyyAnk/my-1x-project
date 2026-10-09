import { BankVisualSpecSchema, type BankQuestion } from "@studio/shared";
import { KID_AUDIENCE_POLICY_LINES } from "../prompts/kidAudiencePolicy.js";
import type {
  RemediatedQuestionOutput,
  StemLeakRemediationInput,
  StemLeakRemediationStrategy,
} from "./stemLeakRemediation.types.js";

/**
 * Resolves the optimal remediation strategy based on question archetype and options.
 * - Mystery reveal or character identification archetypes prioritize context re-anchoring
 *   to preserve the gameplay of guessing the main entity.
 * - Knowledge and trivia archetypes prioritize shifting focus to supporting characters or lore.
 */
export function resolveRemediationStrategy(
  question: BankQuestion,
  preferredStrategy?: StemLeakRemediationStrategy,
): StemLeakRemediationStrategy {
  if (preferredStrategy) {
    return preferredStrategy;
  }

  if (question.archetype_id === "mystery_reveal") {
    return "context_reanchoring";
  }

  return "plot_or_supporting_character";
}

/**
 * Builds a surgical micro-prompt instructing the LLM to rewrite a leaked question
 * while simultaneously synchronizing visual_spec to match the new focus.
 */
export function buildStemLeakRemediationPrompt(input: StemLeakRemediationInput): {
  prompt: string;
  strategy: StemLeakRemediationStrategy;
} {
  const { question, issue, preferredStrategy } = input;
  const strategy = resolveRemediationStrategy(question, preferredStrategy);

  const correctChoice = question.choices?.find((c) => c.id === question.correct_choice_id);
  const leakedAnswer = correctChoice?.text || "Unknown";

  const strategyInstructions =
    strategy === "plot_or_supporting_character"
      ? [
          `=== REMEDIATION STRATEGY: PLOT & SUPPORTING CHARACTER REFRAME ===`,
          `1. KEEP FRANCHISE ANCHOR: Preserve the canonical franchise umbrella prefix (e.g. 'In Pinocchio...', 'In Cinderella...').`,
          `2. SHIFT INQUIRY TARGET: DO NOT ask for the eponymous character's identity. Instead, ask about:`,
          `   - A supporting character (e.g. Geppetto, Fairy Godmother, Lady Tremaine, Jiminy Cricket).`,
          `   - An iconic artifact/item (e.g. glass slipper, growing nose, enchanted pumpkin).`,
          `   - A key plot rule, event, or condition (e.g. magic expiring at midnight).`,
          `3. CHOICES: Provide 3-4 plausible choices fitting the new question. Mark the new correct choice with is_correct: true.`,
          `4. VISUAL SYNCHRONIZATION (MANDATORY): Update visual_spec.prompt to depict the NEW subject, character, or artifact in action. NEVER reuse an image prompt describing the old leaked character alone.`,
        ]
      : [
          `=== REMEDIATION STRATEGY: CONTEXT RE-ANCHORING ===`,
          `1. PRESERVE CORRECT CHARACTER: Keep "${leakedAnswer}" as the correct answer.`,
          `2. REMOVE EPONYMOUS ANCHOR: DO NOT include the franchise title in the question stem.`,
          `3. RE-ANCHOR BY UNIVERSE / STUDIO / GENRE: Anchor using broader lore contexts:`,
          `   - 'In classic Disney animation, which wooden puppet dreams of becoming a real boy?'`,
          `   - 'In fairy tale lore, which princess famously lost a glass slipper at the stroke of midnight?'`,
          `4. CHOICES: Maintain 3-4 plausible peer characters from similar universes/genres.`,
          `5. VISUAL SYNCHRONIZATION (MANDATORY): Update visual_spec.prompt to depict the character with vivid lore traits in their setting without repeating the spoiled title prefix.`,
        ];

  const prompt = [
    `You are a Senior Quiz Doctor and Quality Assurance Specialist for vertical short-form video trivia.`,
    `A question failed QA validation due to a STEM-OPTION LEAKAGE defect where the correct answer was leaked inside the prompt.`,
    ``,
    `=== DEFECT REPORT ===`,
    `- Archetype: "${question.archetype_id || "deep_trivia"}"`,
    `- Original Question: "${question.question}"`,
    `- Leaked Correct Answer: "${leakedAnswer}"`,
    `- QA Issue Message: "${issue.message}"`,
    ``,
    ...strategyInstructions,
    ``,
    ...KID_AUDIENCE_POLICY_LINES,
    ``,
    `=== MOBILE BREVITY & EDITORIAL RULES ===`,
    `- Question length strictly 60 to 80 characters (never exceed 80 chars).`,
    `- Explanation strictly 1 to 2 punchy, educational sentences.`,
    `- Visual prompt written in 100% English describing high-contrast, cinematic vertical scenes.`,
    ``,
    `=== OUTPUT CONTRACT ===`,
    `Output ONLY a valid JSON object matching this schema. NO markdown wrapping outside, NO conversational text:`,
    `{`,
    `  "question": "string (60-80 chars)",`,
    `  "choices": [`,
    `    { "id": "A", "text": "string", "is_correct": boolean },`,
    `    { "id": "B", "text": "string", "is_correct": boolean },`,
    `    { "id": "C", "text": "string", "is_correct": boolean }`,
    `  ],`,
    `  "correct_choice_id": "A",`,
    `  "explanation": "string",`,
    `  "fun_fact": "string",`,
    `  "visual_spec": {`,
    `    "intent": "${question.visual_spec?.intent || "question_illustration"}",`,
    `    "prompt": "Vivid cinematic scene prompt in 100% English describing the updated subject",`,
    `    "aspect_ratio": "${question.visual_spec?.aspect_ratio || "16:9"}"`,
    `  }`,
    `}`,
  ].join("\n");

  return { prompt, strategy };
}

/**
 * Parses and validates raw LLM output from the remediation micro-prompt.
 */
export function parseStemLeakRemediationOutput(
  rawOutput: string,
  originalQuestion: BankQuestion,
  strategyApplied: StemLeakRemediationStrategy,
): RemediatedQuestionOutput {
  const cleaned = rawOutput
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse remediation LLM JSON output: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Remediation output must be a valid JSON object.");
  }

  if (!parsed.question || typeof parsed.question !== "string" || parsed.question.trim().length < 8) {
    throw new Error("Remediated question is missing or too short.");
  }

  if (!Array.isArray(parsed.choices) || parsed.choices.length < (originalQuestion.archetype_id === "mystery_reveal" ? 1 : 2)) {
    throw new Error("Remediated choices array is missing or does not meet archetype minimum.");
  }

  if (!parsed.correct_choice_id || typeof parsed.correct_choice_id !== "string") {
    throw new Error("Remediated correct_choice_id is missing.");
  }

  const validChoice = parsed.choices.find((c: any) => c.id === parsed.correct_choice_id);
  if (!validChoice) {
    throw new Error(`Remediated correct_choice_id "${parsed.correct_choice_id}" not found in choices.`);
  }

  if (!parsed.visual_spec || !parsed.visual_spec.prompt) {
    throw new Error("Remediated question must include a synchronized visual_spec.prompt.");
  }

  return {
    question: parsed.question.trim(),
    choices: parsed.choices.map((c: any) => ({
      id: String(c.id).trim(),
      text: String(c.text).trim(),
      is_correct: c.id === parsed.correct_choice_id,
    })),
    correct_choice_id: parsed.correct_choice_id.trim(),
    explanation: String(parsed.explanation || originalQuestion.explanation || "").trim(),
    fun_fact: parsed.fun_fact ? String(parsed.fun_fact).trim() : originalQuestion.fun_fact,
    visual_spec: {
      // LLM output is untrusted: unknown intents or ratios fall back to the original question's valid values.
      intent:
        BankVisualSpecSchema.shape.intent.removeDefault().safeParse(parsed.visual_spec.intent).data ??
        originalQuestion.visual_spec?.intent ??
        "question_illustration",
      prompt: String(parsed.visual_spec.prompt).trim(),
      aspect_ratio:
        BankVisualSpecSchema.shape.aspect_ratio.removeDefault().safeParse(parsed.visual_spec.aspect_ratio).data ??
        originalQuestion.visual_spec?.aspect_ratio ??
        "16:9",
    },
    remediation_strategy_applied: strategyApplied,
  };
}
