/**
 * Question Bank HTTP Routes
 *
 * Mounts query, CRUD, AI batch generation, and episode creation endpoints
 * for the Question Bank domain.
 */

export {
  registerQuestionBankRoutes,
  type QuestionBankRouteDeps,
  registerQueryRoutes,
  registerCrudRoutes,
  registerBatchRoutes,
  registerBuildRoutes,
  resolveLlmClient,
} from "./questionBank/index.js";
