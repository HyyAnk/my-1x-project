import { normalizeLanguageCode, type QuizQuestion } from "@studio/shared";

/** The reveal line must stay a quick stinger: the label plus a trimmed answer. */
export const QUIZ_SHORT_REVEAL_MAX_WORDS = 8;

const ENGLISH_COUNT_WORDS: Record<number, string> = { 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven" };
const CHINESE_COUNT_WORDS: Record<number, string> = { 3: "三", 4: "四", 5: "五", 6: "六", 7: "七" };
const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
const VERDICT_CHOICE_TEXT = /^(yes|no|true|false)$/i;

function isChinese(language: string): boolean {
  return normalizeLanguageCode(language) === "zh";
}

/** "Five questions. Ready?" with the count spelled out for 3..7 questions. */
export function quizShortKickoffLine(questionCount: number, language: string): string {
  if (isChinese(language)) {
    const word = CHINESE_COUNT_WORDS[questionCount] ?? String(questionCount);
    return `${word}道题，准备好了吗？`;
  }
  const word = ENGLISH_COUNT_WORDS[questionCount] ?? String(questionCount);
  return `${word} questions. Ready?`;
}

/** "A", "B", "C" by position, or the verdict word itself ("Yes"/"No") for yes/no questions. */
export function quizShortChoiceLabel(question: Pick<QuizQuestion, "format" | "choices">, choiceId: string): string {
  const index = question.choices.findIndex((choice) => choice.id === choiceId);
  const choice = question.choices[index];
  if (!choice) return "";
  const text = choice.text.trim();
  if (question.format === "yes_no" || VERDICT_CHOICE_TEXT.test(text)) return text;
  return CHOICE_LETTERS[index] ?? String(index + 1);
}

function trimAnswerWords(answer: string, maxWords: number): string {
  return answer.trim().split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");
}

/** Reveal copy: the correct label plus the answer text, never longer than eight words. */
export function quizShortRevealLine(question: Pick<QuizQuestion, "format" | "choices" | "correct_choice_id">, language: string): string {
  const answer = question.choices.find((choice) => choice.id === question.correct_choice_id)?.text.trim() ?? "";
  const label = quizShortChoiceLabel(question, question.correct_choice_id);
  const labelIsAnswer = label.localeCompare(answer, undefined, { sensitivity: "base" }) === 0;
  if (isChinese(language)) {
    return labelIsAnswer ? `${answer}！` : `${label}，${answer}！`;
  }
  if (labelIsAnswer) return `${label}!`;
  const labelWords = label.split(/\s+/).filter(Boolean).length;
  return `${label}. ${trimAnswerWords(answer, QUIZ_SHORT_REVEAL_MAX_WORDS - labelWords)}!`;
}
