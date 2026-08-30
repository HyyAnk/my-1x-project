import { quizChoiceCountForFormat, type QuizIssue, type QuizV2 } from "@studio/shared";
import { validateTextCopyright } from "../copyrightValidator.js";

export function assessSemanticQa(quiz: QuizV2): QuizIssue[] {
  const issues: QuizIssue[] = [];

  const semanticProblems = quiz.questions.flatMap((question) => {
    const result: QuizIssue[] = [];
    const requiredChoiceCount = quizChoiceCountForFormat(question.format);
    if (question.choices.length !== requiredChoiceCount) {
      result.push({
        code: "quiz_choice_count_invalid",
        severity: "blocker",
        message: `Question ${question.number} has ${question.choices.length} choices; exactly ${requiredChoiceCount} required.`,
        next_action: "Regenerate the question with only the canonical A–C answer layout (or exactly True/False).",
        question_ids: [question.id],
        stage: "semantic",
      });
    }
    if (!question.validation.fact_locked) {
      result.push({
        code: "semantic_fact_unlocked",
        severity: "blocker",
        message: "Question " + question.number + " is not fact locked.",
        next_action: "Validate the canonical answer and explanation before directing or rendering.",
        question_ids: [question.id],
        stage: "semantic",
      });
    }
    if (!question.source_ids.length) {
      result.push({
        code: "semantic_sources_missing",
        severity: "blocker",
        message: "Question " + question.number + " has no source IDs.",
        next_action: "Attach source IDs from the research ledger before rendering.",
        question_ids: [question.id],
        stage: "semantic",
      });
    }
    const textToScan = `${question.question} ${question.choices.map((c) => c.text).join(" ")} ${question.explanation} ${question.visual_opportunity ?? ""}`;
    const copyright = validateTextCopyright(textToScan);
    if (copyright.violated) {
      result.push({
        code: "semantic_copyright_violation",
        severity: "blocker",
        message: `Question ${question.number} contains prohibited term '${copyright.term}' (${copyright.reason}).`,
        next_action: "Regenerate this question using a safe alternative subject without using copyrighted characters or lion cubs.",
        question_ids: [question.id],
        stage: "semantic",
      });
    }
    if (question.question.length > 100) {
      result.push({
        code: "layout_question_long",
        severity: "warning",
        message: "Question " + question.number + " exceeds the recommended child-friendly limit (100 characters).",
        next_action: "Shorten the question to be direct, punchy, and under 10 words.",
        question_ids: [question.id],
        stage: "layout",
      });
    }
    if (question.explanation.length > 90) {
      result.push({
        code: "layout_explanation_long",
        severity: "warning",
        message: "Question " + question.number + " explanation exceeds the recommended child-friendly limit (90 characters).",
        next_action: "Shorten the explanation to strictly 1 punchy fun fact under 10 words (under 70 characters).",
        question_ids: [question.id],
        stage: "layout",
      });
    }
    if (question.choices.some((choice) => choice.text.length > 100)) {
      result.push({
        code: "layout_choice_long",
        severity: "warning",
        message: "Question " + question.number + " contains a long answer choice.",
        next_action: "Shorten the choice text so it remains readable on a 16:9 card.",
        question_ids: [question.id],
        stage: "layout",
      });
    }
    return result;
  });
  issues.push(...semanticProblems);

  // Position bias and consecutive same answer checks
  const positionCounts = new Map<number, number>();
  let previousCorrectIndex: number | null = null;
  for (const question of quiz.questions) {
    const correctIndex = question.choices.findIndex((choice) => choice.id === question.correct_choice_id);
    if (correctIndex >= 0) {
      positionCounts.set(correctIndex, (positionCounts.get(correctIndex) ?? 0) + 1);
      if (question.choices.length >= 3 && previousCorrectIndex !== null && correctIndex === previousCorrectIndex) {
        issues.push({
          code: "quiz_consecutive_same_answer_position",
          severity: "warning",
          message: `Question ${question.number} has the same correct answer position (${String.fromCharCode(65 + correctIndex)}) as the previous question.`,
          next_action: "Rebalance choice order so consecutive questions do not share the same correct choice letter.",
          question_ids: [question.id],
          stage: "semantic",
        });
      }
      previousCorrectIndex = correctIndex;
    }
  }

  const mostCommonPosition = Math.max(0, ...positionCounts.values());
  if (quiz.questions.length >= 5 && mostCommonPosition / quiz.questions.length > 0.6) {
    const dominantPosition = [...positionCounts.entries()].find(([, count]) => count === mostCommonPosition)?.[0] ?? 0;
    issues.push({
      code: "quiz_answer_position_bias",
      severity: "warning",
      message: `Correct answers are concentrated in choice ${String.fromCharCode(65 + dominantPosition)} (${mostCommonPosition}/${quiz.questions.length}).`,
      next_action: "Rebalance or deterministically shuffle visible choices while preserving the canonical answer mapping.",
      question_ids: quiz.questions
        .filter((question) => question.choices.findIndex((choice) => choice.id === question.correct_choice_id) === dominantPosition)
        .map((question) => question.id),
      stage: "semantic",
    });
  }

  return issues;
}
