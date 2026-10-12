import type { FastifyInstance } from "fastify";
import {
  highlightBackfillJobManager,
  readActiveBankQuestions,
  summarizeHighlightCoverage,
} from "../../quiz/bank/highlight/index.js";
import { resolveLlmClient } from "./batchRoutes.js";
import type { QuestionBankRouteDeps } from "./index.js";

/**
 * Registers the Question Bank highlight phrase endpoints: coverage, and the background backfill job
 * that gives every existing question an LLM-chosen highlight phrase.
 */
export function registerHighlightRoutes(server: FastifyInstance, deps: QuestionBankRouteDeps): void {
  server.get("/api/question-bank/highlight-coverage", async () => {
    const coverage = summarizeHighlightCoverage(await readActiveBankQuestions(deps.repository));
    return { coverage };
  });

  server.get("/api/question-bank/highlight-backfill/status", () => ({ job: highlightBackfillJobManager.getStatus() }));

  server.post("/api/question-bank/highlight-backfill", async (_request, reply) => {
    if (highlightBackfillJobManager.isRunning()) {
      return reply.code(409).send({
        error: "A highlight backfill job is already running",
        code: "JOB_ALREADY_RUNNING",
        job: highlightBackfillJobManager.getStatus(),
      });
    }
    const llmClient = resolveLlmClient(deps);
    if (!llmClient) {
      return reply.code(503).send({
        error: "No AI engine (Antigravity/Codex) is configured or available to choose highlight phrases.",
        code: "AI_CLIENT_UNAVAILABLE",
      });
    }
    const job = highlightBackfillJobManager.start(deps.repository, llmClient);
    return reply.code(202).send({ success: true, job });
  });

  server.post("/api/question-bank/highlight-backfill/cancel", () => {
    const cancelled = highlightBackfillJobManager.cancel();
    return { success: cancelled, job: highlightBackfillJobManager.getStatus() };
  });
}
