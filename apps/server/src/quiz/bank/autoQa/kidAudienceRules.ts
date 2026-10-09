import type { BankQuestion } from "@studio/shared";
import { checkKidReadingLevel } from "../audience/kidReadingLevel.js";
import { describeKidSafetyFinding, detectKidSafetyIssue } from "../kidSafety/kidSafetyDetector.js";
import type { AutoQaIssue } from "./autoQa.types.js";

/** Raw model candidates can miss fields; screen whatever text is present instead of failing. */
function viewerFacingCopy(question: BankQuestion) {
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    question: text(question.question),
    choices: Array.isArray(question.choices) ? question.choices.map((choice) => ({ text: text(choice?.text) })) : [],
    explanation: text(question.explanation),
    fun_fact: text(question.fun_fact),
  };
}

/** Rejects generated questions whose content or reading level does not suit a kids and family audience. */
export function checkKidAudienceIssues(question: BankQuestion): AutoQaIssue[] {
  const issues: AutoQaIssue[] = [];
  const copy = viewerFacingCopy(question);
  const safetyFinding = detectKidSafetyIssue(copy);
  if (safetyFinding) {
    issues.push({
      type: "quality",
      message: describeKidSafetyFinding(safetyFinding),
      details: { rule: "kid_safety", ...safetyFinding },
    });
  }
  for (const readingIssue of checkKidReadingLevel(copy)) {
    issues.push({ type: "quality", message: readingIssue.message, details: { rule: "kid_reading_level", field: readingIssue.field } });
  }
  return issues;
}
