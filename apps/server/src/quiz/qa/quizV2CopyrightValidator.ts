import type { QuizQuestion, QuizV2 } from "@studio/shared";
import { validateTextCopyright, type CopyrightViolation } from "./copyrightValidator.js";

export type QuizV2CopyrightViolation = CopyrightViolation & {
  questionIndex?: number;
  field?: string;
};

/**
 * Scans all content fields of a single QuizQuestion for prohibited copyright terms.
 * Inspects: question text, choices, explanation, fun_fact, and visual_opportunity.
 */
export function validateQuizQuestionCopyright(question: QuizQuestion): CopyrightViolation & { field?: string } {
  // 1. Question text
  const questionCheck = validateTextCopyright(question.question);
  if (questionCheck.violated) {
    return {
      ...questionCheck,
      field: "question",
    };
  }

  // 2. Choices
  if (Array.isArray(question.choices)) {
    for (let cIndex = 0; cIndex < question.choices.length; cIndex++) {
      const choice = question.choices[cIndex];
      if (!choice?.text) continue;
      const choiceCheck = validateTextCopyright(choice.text);
      if (choiceCheck.violated) {
        return {
          ...choiceCheck,
          field: `choices[${cIndex}].text`,
        };
      }
    }
  }

  // 3. Explanation
  const explanationCheck = validateTextCopyright(question.explanation);
  if (explanationCheck.violated) {
    return {
      ...explanationCheck,
      field: "explanation",
    };
  }

  // 4. Fun Fact
  if (question.fun_fact) {
    const funFactCheck = validateTextCopyright(question.fun_fact);
    if (funFactCheck.violated) {
      return {
        ...funFactCheck,
        field: "fun_fact",
      };
    }
  }

  // 5. Visual Opportunity
  if (question.visual_opportunity) {
    const visualCheck = validateTextCopyright(question.visual_opportunity);
    if (visualCheck.violated) {
      return {
        ...visualCheck,
        field: "visual_opportunity",
      };
    }
  }

  return { violated: false };
}

/**
 * Validates an entire QuizV2 structure for prohibited copyright and trademark violations.
 * Scans each question in sequential order across all user-facing and prompt fields.
 */
export function validateQuizV2Copyright(quiz: QuizV2): QuizV2CopyrightViolation {
  if (!quiz || !Array.isArray(quiz.questions)) {
    return { violated: false };
  }

  for (let index = 0; index < quiz.questions.length; index++) {
    const question = quiz.questions[index];
    if (!question) continue;

    const violation = validateQuizQuestionCopyright(question);
    if (violation.violated) {
      return {
        ...violation,
        questionNumber: question.number ?? index + 1,
        questionIndex: index,
      };
    }
  }

  return { violated: false };
}
