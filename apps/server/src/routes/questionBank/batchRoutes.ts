import type { FastifyInstance } from "fastify";
import type { BankGameplayArchetypeId, BankQuestion } from "@studio/shared";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { generateQuestionBankBatch, type GenerateBatchInput } from "../../quiz/bank/questionBankBatchService.js";
import { questionBankJobManager } from "../../quiz/bank/questionBankJobManager.js";
import type { QuestionBankRouteDeps } from "./index.js";

/**
 * Resolves the appropriate LLM client from route dependencies and active app state.
 */
export function resolveLlmClient(deps: QuestionBankRouteDeps): LLMClient | undefined {
  if (deps.llmClient) return deps.llmClient;
  if (deps.state) {
    return deps.state.config.active_engine === "antigravity" && deps.antigravity ? deps.antigravity : (deps.codex ?? deps.antigravity);
  }
  return deps.antigravity ?? deps.codex;
}

function validateManualModeParams(body: Record<string, unknown>): { error: string; code: string } | null {
  const mode: "auto" | "manual" =
    body.mode === "auto" || body.mode === "manual" ? body.mode : body.domain_id || body.archetype_id ? "manual" : "auto";

  if (mode === "manual" && (!Array.isArray(body.candidates) || body.candidates.length === 0)) {
    if (body.archetype_id !== undefined && typeof body.archetype_id !== "string") {
      return { error: "Missing or invalid archetype_id", code: "INVALID_PARAM" };
    }
    if (body.domain_id !== undefined && typeof body.domain_id !== "string") {
      return { error: "Missing or invalid domain_id", code: "INVALID_PARAM" };
    }
    if (body.subtopic_id !== undefined && typeof body.subtopic_id !== "string") {
      return { error: "Missing or invalid subtopic_id", code: "INVALID_PARAM" };
    }
  }
  return null;
}

function buildGenerateBatchPayload(body: Record<string, unknown>, llmClient?: LLMClient): GenerateBatchInput {
  const mode: "auto" | "manual" =
    body.mode === "auto" || body.mode === "manual" ? body.mode : body.domain_id || body.archetype_id ? "manual" : "auto";

  const count = typeof body.count === "number" ? body.count : typeof body.target_count === "number" ? body.target_count : 20;

  return {
    mode,
    archetypeId: typeof body.archetype_id === "string" ? (body.archetype_id as BankGameplayArchetypeId) : undefined,
    domainId: typeof body.domain_id === "string" ? body.domain_id : undefined,
    subtopicId: typeof body.subtopic_id === "string" ? body.subtopic_id : undefined,
    subtopicTitle: typeof body.subtopic_title === "string" ? body.subtopic_title : undefined,
    count,
    language: typeof body.language === "string" ? body.language : undefined,
    difficulty: typeof body.difficulty === "number" ? body.difficulty : undefined,
    ageBand:
      typeof body.age_band === "string" && (["kids", "family", "teen", "mature"] as const).includes(body.age_band as never)
        ? (body.age_band as "kids" | "family" | "teen" | "mature")
        : undefined,
    persist: body.persist !== false,
    llmClient,
    rawCandidatesOverride: Array.isArray(body.candidates)
      ? body.candidates.filter((c): c is BankQuestion => typeof c === "object" && c !== null)
      : undefined,
  };
}

/**
 * Registers batch generation endpoints and background job management handlers.
 */
export function registerBatchRoutes(server: FastifyInstance, deps: QuestionBankRouteDeps): void {
  // 9. AI Batch Generation with Auto-QA
  server.post("/api/question-bank/generate-batch", async (request, reply) => {
    const body = (request.body || {}) as Record<string, unknown>;

    const validationError = validateManualModeParams(body);
    if (validationError) {
      return reply.code(400).send(validationError);
    }

    const llmClient = resolveLlmClient(deps);
    if (!llmClient && (!Array.isArray(body.candidates) || body.candidates.length === 0)) {
      return reply.code(503).send({
        error: "No AI engine (Antigravity/Codex) is configured or available to generate questions.",
        code: "AI_CLIENT_UNAVAILABLE",
      });
    }

    const inputPayload = buildGenerateBatchPayload(body, llmClient);

    // Support background execution (for AI generation when candidates are not explicitly overridden)
    const hasCandidates = Array.isArray(body.candidates) && body.candidates.length > 0;
    const runInBackground = body.background === true || (body.wait !== true && !hasCandidates);

    if (runInBackground) {
      const jobLaunch = questionBankJobManager.startJob(deps.repository, inputPayload);
      if (!jobLaunch.started) {
        return reply.code(409).send({
          error: jobLaunch.error || "A batch generation job is already running",
          code: "JOB_ALREADY_RUNNING",
          job: jobLaunch.job,
        });
      }
      return reply.code(202).send({
        success: true,
        job: jobLaunch.job,
      });
    }

    // Synchronous path (for tests or explicit callers requesting wait: true)
    const result = await generateQuestionBankBatch(deps.repository, inputPayload);
    return reply.code(200).send(result);
  });

  // 9.1 Status of active or latest Question Bank background generation job
  server.get("/api/question-bank/generate-batch/status", () => {
    const job = questionBankJobManager.getStatus();
    return { job };
  });

  // 9.2 Cancel active Question Bank background generation job
  server.post("/api/question-bank/generate-batch/cancel", () => {
    const cancelled = questionBankJobManager.cancelJob();
    const job = questionBankJobManager.getStatus();
    return { success: cancelled, job };
  });

  // 9.3 Dismiss Question Bank background generation job notification
  server.post("/api/question-bank/generate-batch/dismiss", () => {
    const dismissed = questionBankJobManager.dismissJob();
    const job = questionBankJobManager.getStatus();
    return { success: dismissed, job };
  });
}
