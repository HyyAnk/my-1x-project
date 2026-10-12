export { QUESTION_HIGHLIGHT_RULE_LINES } from "./questionHighlightRules.js";
export { buildHighlightAnnotationPrompt } from "./highlightAnnotationPrompt.js";
export { parseHighlightAnnotationOutput } from "./highlightAnnotationParser.js";
export {
  annotateHighlightPhrases,
  completeHighlightPhrases,
  needsHighlightPhrase,
  withValidatedHighlightPhrase,
  type CompleteHighlightPhrasesDeps,
} from "./highlightAnnotationService.js";
export type { HighlightAnnotationDeps, HighlightAnnotationResult, HighlightAnnotationSubject } from "./highlightAnnotation.types.js";
export { readActiveBankQuestions, runHighlightBackfill, summarizeHighlightCoverage } from "./highlightBackfillService.js";
export {
  HighlightBackfillJobManager,
  highlightBackfillJobManager,
  type HighlightBackfillJobState,
  type HighlightBackfillJobStatus,
} from "./highlightBackfillJobManager.js";
export type {
  HighlightBackfillOptions,
  HighlightBackfillProgress,
  HighlightBackfillReport,
  HighlightBackfillRepository,
  HighlightCoverage,
} from "./highlightBackfill.types.js";
