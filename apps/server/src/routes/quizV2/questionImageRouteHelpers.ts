import { RepositoryError } from "../../repository.js";
import type { QuizQuestion } from "@studio/shared";

/**
 * Decodes a base64 encoded image string or data URI into Uint8Array buffer.
 */
export function decodeBase64Image(data: string): Uint8Array {
  const match = data.match(/^data:([^;]+);base64,(.+)$/s);
  const base64Data = (match ? match[2] : data).replace(/\s+/g, "");
  if (!base64Data) {
    throw new RepositoryError("Image data is empty", "INVALID_IMAGE");
  }
  return new Uint8Array(Buffer.from(base64Data, "base64"));
}

/**
 * Builds candidate identifier variations for a question number to match various naming schemes
 * (e.g. "q-1", "q1", "question-01", "question_1", and the actual question.id).
 */
export function buildQuestionIdCandidates(questionNumber: number, actualQId?: string): Set<string> {
  const padded = String(questionNumber).padStart(2, "0");
  const candidates = new Set<string>([
    `q-${questionNumber}`,
    `q${questionNumber}`,
    `question-${questionNumber}`,
    `question_${questionNumber}`,
    `question-${padded}`,
    `question_${padded}`,
    `q-${padded}`,
    `q${padded}`,
  ]);
  if (actualQId) candidates.add(actualQId);
  return candidates;
}

/**
 * Checks whether an asset belongs to a targeted question candidate list.
 */
export function isAssetForQuestion(
  a: { question_id?: string | null; asset_id?: string },
  candidates: Set<string>,
): boolean {
  if (a.question_id && candidates.has(a.question_id)) return true;
  if (a.asset_id) {
    for (const cand of candidates) {
      if (a.asset_id.includes(cand)) return true;
    }
  }
  return false;
}

/**
 * Builds slot aliases for multi-choice layout slots (e.g. "c1", "choice-a", "choice_a").
 */
export function buildSlotAliases(normSlot: string, targetQuestion?: QuizQuestion): Set<string> {
  const slotAliases = new Set<string>([normSlot]);
  if (normSlot === "c1" || normSlot === "choice-a" || normSlot === "choice_a") {
    slotAliases.add("c1");
    slotAliases.add("choice-a");
    slotAliases.add("choice_a");
    if (targetQuestion?.choices?.[0]?.id) slotAliases.add(targetQuestion.choices[0].id.toLowerCase());
  } else if (normSlot === "c2" || normSlot === "choice-b" || normSlot === "choice_b") {
    slotAliases.add("c2");
    slotAliases.add("choice-b");
    slotAliases.add("choice_b");
    if (targetQuestion?.choices?.[1]?.id) slotAliases.add(targetQuestion.choices[1].id.toLowerCase());
  } else if (normSlot === "c3" || normSlot === "choice-c" || normSlot === "choice_c") {
    slotAliases.add("c3");
    slotAliases.add("choice-c");
    slotAliases.add("choice_c");
    if (targetQuestion?.choices?.[2]?.id) slotAliases.add(targetQuestion.choices[2].id.toLowerCase());
  }
  return slotAliases;
}

/**
 * Evaluates whether an asset matches a specific slot alias set or hero requirement.
 */
export function matchesSlot(
  a: { choice_id?: string | null; asset_id?: string; semantic_key?: string | null; purpose?: string },
  normSlot: string,
  slotAliases: Set<string>,
): boolean {
  if (normSlot === "hero") {
    return a.purpose === "hero_question_image" || Boolean(a.asset_id?.includes("hero"));
  }
  for (const alias of slotAliases) {
    if (a.choice_id?.toLowerCase() === alias) return true;
    if (a.asset_id?.toLowerCase().endsWith(`-${alias}`)) return true;
    if (a.asset_id?.toLowerCase().endsWith(`_${alias}`)) return true;
    if (a.semantic_key?.toLowerCase().endsWith(`:choice:${alias}`)) return true;
    if (a.semantic_key?.toLowerCase().endsWith(`:${alias}`)) return true;
  }
  return false;
}

/**
 * Returns MIME type based on file extension.
 */
export function resolveImageContentType(filePath: string): string {
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  return "image/png";
}
