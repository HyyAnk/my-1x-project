import { BankQuestionSchema, type BankQuestion } from "../schemas/questionBank.js";
import {
  CompleteShortReelSourceSnapshotSchema,
  computeSourceContentHash,
  isEnglishLanguage,
  sha256Hex,
  canonicalJsonStringify,
  type ShortReelSourceSnapshot,
  type ShortReelSourceProvenance,
  type ShortReelSourceChoice,
} from "./shortReelSource.schema.js";

export { sha256Hex, canonicalJsonStringify, computeSourceContentHash, isEnglishLanguage };

interface ResolvedSourceContent {
  questionText: string;
  explanation: string;
  choices: ShortReelSourceChoice[];
}

function resolveSourceContent(originalQuestion: BankQuestion): ResolvedSourceContent {
  if (!isEnglishLanguage(originalQuestion.language)) {
    throw new Error(
      `Invalid source question: language must be English for 'source' provenance (received '${originalQuestion.language ?? ""}')`,
    );
  }
  return {
    questionText: originalQuestion.question,
    explanation: originalQuestion.explanation,
    choices: originalQuestion.choices.map((c) => ({
      id: c.id,
      text: c.text,
      is_correct: c.id === originalQuestion.correct_choice_id,
    })),
  };
}

function resolveTranslationContent(originalQuestion: BankQuestion): ResolvedSourceContent {
  const translations = originalQuestion.translations ?? {};
  const validCandidates: { key: string; translation: (typeof translations)[string] }[] = [];

  for (const [key, trans] of Object.entries(translations)) {
    if (!trans || !trans.verified) continue;
    if (trans.language && !isEnglishLanguage(trans.language)) continue;
    if (!trans.language && !isEnglishLanguage(key)) continue;
    if (!trans.question || typeof trans.question !== "string" || trans.question.length === 0) continue;
    if (!trans.explanation || typeof trans.explanation !== "string" || trans.explanation.length === 0) continue;
    if (!Array.isArray(trans.choices) || trans.choices.length !== originalQuestion.choices.length) continue;

    const transChoiceIds = new Set(trans.choices.map((c) => c.id));
    if (transChoiceIds.size !== trans.choices.length) continue;
    if (!originalQuestion.choices.every((c) => transChoiceIds.has(c.id))) continue;

    validCandidates.push({ key, translation: trans });
  }

  if (validCandidates.length === 0) {
    const hasUnverified = Object.entries(translations).some(([key, trans]) => {
      if (!trans || trans.verified) return false;
      return isEnglishLanguage(trans.language) || (!trans.language && isEnglishLanguage(key));
    });
    if (hasUnverified) {
      throw new Error("Invalid source question: English translation is not verified");
    }
    throw new Error("Invalid source question: no valid verified English translation found");
  }

  validCandidates.sort((a, b) => {
    const preferredOrder = ["en", "English", "en-US", "en-GB"];
    const aIdx = preferredOrder.indexOf(a.key);
    const bIdx = preferredOrder.indexOf(b.key);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.key.localeCompare(b.key);
  });

  const selectedTrans = validCandidates[0].translation;
  return {
    questionText: selectedTrans.question,
    explanation: selectedTrans.explanation,
    choices: selectedTrans.choices.map((c) => ({
      id: c.id,
      text: c.text,
      is_correct: c.id === originalQuestion.correct_choice_id,
    })),
  };
}

export function createEnglishSourceSnapshot(
  inputQuestion: BankQuestion,
  provenance: ShortReelSourceProvenance = "source",
): ShortReelSourceSnapshot {
  const validated = BankQuestionSchema.parse(inputQuestion);
  const originalQuestion: BankQuestion = structuredClone(validated);

  if (originalQuestion.status !== "approved") {
    throw new Error(`Invalid source question: status must be 'approved', received '${originalQuestion.status}'`);
  }

  if (originalQuestion.archetype_id !== "versus_faceoff" && originalQuestion.archetype_id !== "deep_trivia") {
    throw new Error(
      `Invalid source question: archetype must be 'versus_faceoff' or 'deep_trivia', received '${originalQuestion.archetype_id}'`,
    );
  }

  const content =
    provenance === "source"
      ? resolveSourceContent(originalQuestion)
      : provenance === "verified_translation"
        ? resolveTranslationContent(originalQuestion)
        : (() => {
            const unhandled = provenance as unknown as string;
            throw new Error(`Unsupported translation provenance: '${unhandled}'`);
          })();

  const correctChoice = content.choices.find((c) => c.is_correct);
  if (!correctChoice) {
    throw new Error(`Correct choice '${originalQuestion.correct_choice_id}' not found in choices`);
  }

  const projection = {
    question_id: originalQuestion.id,
    archetype_id: originalQuestion.archetype_id,
    question_text: content.questionText,
    choices: content.choices,
    correct_choice_id: originalQuestion.correct_choice_id,
    explanation: content.explanation,
    selected_answer_text: correctChoice.text,
    source_language: originalQuestion.language ?? null,
    translation_provenance: provenance,
    original_updated_at: originalQuestion.updated_at ?? null,
  };

  const contentHash = computeSourceContentHash(originalQuestion, projection);

  return CompleteShortReelSourceSnapshotSchema.parse({
    fidelity: "complete",
    original_question: originalQuestion,
    ...projection,
    content_hash: contentHash,
  });
}

export function createSourceSnapshot(bankQuestion: BankQuestion): ShortReelSourceSnapshot {
  return createEnglishSourceSnapshot(bankQuestion, "source");
}
