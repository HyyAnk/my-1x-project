import { BankVisualSpecSchema, type BankQuestion } from "@studio/shared";
import type { RemediatedQuestionOutput, StemLeakRemediationStrategy } from "./stemLeakRemediation.types.js";
import {
  isUnknownRecord,
  parseRemediationJson,
  readUntrustedField,
  stringifyUntrustedValue,
  stripJsonCodeFence,
  type UnknownRecord,
} from "./stemLeakRemediationOutputGuards.js";

interface ValidatedRemediationPayload {
  raw: UnknownRecord;
  question: string;
  choices: unknown[];
  correctChoiceId: string;
  visualSpec: unknown;
}

function assertRemediationObject(parsed: unknown): UnknownRecord {
  if (!isUnknownRecord(parsed)) {
    throw new Error("Remediation output must be a valid JSON object.");
  }
  return parsed;
}

function assertRemediatedQuestion(question: unknown): string {
  if (!question || typeof question !== "string" || question.trim().length < 8) {
    throw new Error("Remediated question is missing or too short.");
  }
  return question;
}

function assertRemediatedChoices(choices: unknown, originalQuestion: BankQuestion): unknown[] {
  const minimumChoices = originalQuestion.archetype_id === "mystery_reveal" ? 1 : 2;
  if (!Array.isArray(choices) || choices.length < minimumChoices) {
    throw new Error("Remediated choices array is missing or does not meet archetype minimum.");
  }
  return choices as unknown[];
}

function assertCorrectChoiceId(correctChoiceId: unknown, choices: unknown[]): string {
  if (!correctChoiceId || typeof correctChoiceId !== "string") {
    throw new Error("Remediated correct_choice_id is missing.");
  }
  const validChoice = choices.find((choice) => readUntrustedField(choice, "id") === correctChoiceId);
  if (!validChoice) {
    throw new Error(`Remediated correct_choice_id "${correctChoiceId}" not found in choices.`);
  }
  return correctChoiceId;
}

function assertVisualSpecPrompt(visualSpec: unknown): void {
  if (!visualSpec || !readUntrustedField(visualSpec, "prompt")) {
    throw new Error("Remediated question must include a synchronized visual_spec.prompt.");
  }
}

function validateRemediationPayload(parsed: unknown, originalQuestion: BankQuestion): ValidatedRemediationPayload {
  const raw = assertRemediationObject(parsed);
  const question = assertRemediatedQuestion(raw.question);
  const choices = assertRemediatedChoices(raw.choices, originalQuestion);
  const correctChoiceId = assertCorrectChoiceId(raw.correct_choice_id, choices);
  assertVisualSpecPrompt(raw.visual_spec);
  return { raw, question, choices, correctChoiceId, visualSpec: raw.visual_spec };
}

function mapRemediatedChoices(choices: unknown[], correctChoiceId: string): RemediatedQuestionOutput["choices"] {
  return choices.map((choice) => {
    const id = readUntrustedField(choice, "id");
    return {
      id: stringifyUntrustedValue(id).trim(),
      text: stringifyUntrustedValue(readUntrustedField(choice, "text")).trim(),
      is_correct: id === correctChoiceId,
    };
  });
}

// LLM output is untrusted: unknown intents or ratios fall back to the original question's valid values.
function buildRemediatedVisualSpec(
  visualSpec: unknown,
  originalQuestion: BankQuestion,
): RemediatedQuestionOutput["visual_spec"] {
  return {
    intent:
      BankVisualSpecSchema.shape.intent.removeDefault().safeParse(readUntrustedField(visualSpec, "intent")).data ??
      originalQuestion.visual_spec?.intent ??
      "question_illustration",
    prompt: stringifyUntrustedValue(readUntrustedField(visualSpec, "prompt")).trim(),
    aspect_ratio:
      BankVisualSpecSchema.shape.aspect_ratio
        .removeDefault()
        .safeParse(readUntrustedField(visualSpec, "aspect_ratio")).data ??
      originalQuestion.visual_spec?.aspect_ratio ??
      "16:9",
  };
}

/**
 * Parses and validates raw LLM output from the remediation micro-prompt.
 */
export function parseStemLeakRemediationOutput(
  rawOutput: string,
  originalQuestion: BankQuestion,
  strategyApplied: StemLeakRemediationStrategy,
): RemediatedQuestionOutput {
  const parsed = parseRemediationJson(stripJsonCodeFence(rawOutput));
  const payload = validateRemediationPayload(parsed, originalQuestion);
  const { raw } = payload;

  return {
    question: payload.question.trim(),
    choices: mapRemediatedChoices(payload.choices, payload.correctChoiceId),
    correct_choice_id: payload.correctChoiceId.trim(),
    explanation: stringifyUntrustedValue(raw.explanation || originalQuestion.explanation || "").trim(),
    fun_fact: raw.fun_fact ? stringifyUntrustedValue(raw.fun_fact).trim() : originalQuestion.fun_fact,
    visual_spec: buildRemediatedVisualSpec(payload.visualSpec, originalQuestion),
    remediation_strategy_applied: strategyApplied,
  };
}
