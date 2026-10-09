import { countWords, fleschKincaidGrade } from "./readability.js";

/**
 * Reading-level ceilings for kids and family content. Generation prompts target grade 4-6;
 * these limits are the hard rejection line. Flesch-Kincaid overrates short single sentences that carry
 * proper nouns (franchise and place names), so the line sits at grade 12 to reject only genuinely academic copy.
 */
export const KID_READING_LIMITS = {
  maxQuestionGrade: 12,
  maxExplanationGrade: 12,
  maxExplanationWords: 30,
  maxFunFactWords: 32,
} as const;

export interface KidReadingLevelIssue {
  field: "question" | "explanation" | "fun_fact";
  message: string;
}

export interface KidReadingLevelInput {
  question: string;
  explanation?: string;
  fun_fact?: string;
}

/** Below this length a couple of long words swing the Flesch-Kincaid grade wildly, and short copy is easy to follow anyway. */
const MIN_WORDS_FOR_GRADE_CHECK = 12;

function gradeIssue(field: KidReadingLevelIssue["field"], text: string, maxGrade: number): KidReadingLevelIssue | null {
  if (countWords(text) < MIN_WORDS_FOR_GRADE_CHECK) return null;
  const grade = fleschKincaidGrade(text);
  if (grade <= maxGrade) return null;
  return {
    field,
    message: `The ${field.replace("_", " ")} reads at grade ${grade.toFixed(1)}, above the kids limit of ${maxGrade}. Use shorter sentences and everyday words.`,
  };
}

function lengthIssue(field: KidReadingLevelIssue["field"], text: string, maxWords: number): KidReadingLevelIssue | null {
  const words = countWords(text);
  if (words <= maxWords) return null;
  return { field, message: `The ${field.replace("_", " ")} has ${words} words, above the kids limit of ${maxWords}.` };
}

/** Returns every reading-level problem that makes a question too hard for young viewers to follow. */
export function checkKidReadingLevel(input: KidReadingLevelInput): KidReadingLevelIssue[] {
  const explanation = input.explanation ?? "";
  const funFact = input.fun_fact ?? "";
  return [
    gradeIssue("question", input.question, KID_READING_LIMITS.maxQuestionGrade),
    gradeIssue("explanation", explanation, KID_READING_LIMITS.maxExplanationGrade),
    lengthIssue("explanation", explanation, KID_READING_LIMITS.maxExplanationWords),
    lengthIssue("fun_fact", funFact, KID_READING_LIMITS.maxFunFactWords),
  ].filter((issue): issue is KidReadingLevelIssue => issue !== null);
}
