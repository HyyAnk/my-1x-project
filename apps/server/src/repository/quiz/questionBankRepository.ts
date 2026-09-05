/**
 * Question Bank Repository Facade
 *
 * Provides backwards-compatible entry points and RepositoryRuntime bindings
 * for question bank storage, taxonomy, indexing, querying, and translation caches.
 */

export {
  QUESTION_BANK_DIR,
  getQuestionBankPath,
  getQuestionBankWritePath,
} from "./bank/bankPathResolver.js";

export {
  CANONICAL_DOMAIN_META,
  formatTitleFromId,
  syncTaxonomyFromKnowledgeBase,
  readQuestionBankTaxonomy,
} from "./bank/bankTaxonomySync.js";

export {
  matchesArchetypeFilter,
  readSubtopicBatch,
  writeSubtopicBatch,
  listQuestionBankBatches,
} from "./bank/bankBatchStorage.js";

export {
  readQuestionBankIndex,
  recalculateQuestionBankIndex,
  getQuestionBankMatrixCoverage,
} from "./bank/bankIndexManager.js";

export {
  COOLDOWN_DAYS_DEFAULT,
  type QueryQuestionBankParams,
  queryQuestionBankQuestions,
  searchQuestionBank,
  getQuestionBankQuestion,
  saveQuestionBankQuestion,
  deleteQuestionBankQuestion,
  clearQuestionBank,
  clearAllQuestionBankQuestions,
} from "./bank/bankQueryEngine.js";

export {
  saveQuestionBankTranslation,
  readQuestionBankTranslation,
} from "./bank/bankTranslationStore.js";
