import type { FastifyPluginCallback } from "fastify";
import { BankQuestionSchema } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { TaskManager } from "../tasks.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient } from "../codex.js";
import type { AppState } from "./state.js";
import { generateQuestionBankBatch } from "../quiz/bank/questionBankBatchService.js";
import { createEpisodeFromQuestionBank } from "../quiz/bank/questionBankToQuizBridge.js";
import { transcreateBankQuestion } from "../quiz/bank/transcreation/transcreationEngine.js";

export type QuestionBankRouteDeps = {
  repository: RepositoryService;
  tasks?: TaskManager;
  llmClient?: LLMClient;
  codex?: CodexAppServerClient;
  antigravity?: AntigravityClient;
  state?: AppState;
};

export function registerQuestionBankRoutes(deps: QuestionBankRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    // 1. Taxonomy
    server.get("/api/question-bank/taxonomy", async () => {
      const taxonomy = await deps.repository.readQuestionBankTaxonomy();
      return { taxonomy };
    });

    // 2. Stats & Index
    server.get("/api/question-bank/stats", async () => {
      const stats = await deps.repository.readQuestionBankIndex();
      return { stats };
    });

    server.post("/api/question-bank/stats/recalculate", async () => {
      const stats = await deps.repository.recalculateQuestionBankIndex();
      return { stats };
    });

    // 3. Query questions with Channel-scoped Cooldown
    server.get("/api/channels/:channelId/question-bank/questions", async (request) => {
      const { channelId } = request.params as { channelId: string };
      const query = request.query as Record<string, string | undefined>;

      const limit = query.limit ? Number.parseInt(query.limit, 10) : 50;
      const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;
      const readyOnly = query.ready_only === "true" || query.ready_only === "1";
      const cooldownOnly = query.cooldown_only === "true" || query.cooldown_only === "1";

      const result = await deps.repository.queryQuestionBankQuestions({
        channelId,
        archetypeId: query.archetype_id,
        domainId: query.domain_id,
        subtopicId: query.subtopic_id,
        status: query.status,
        search: query.search,
        language: query.language,
        hasTranslationFor: query.has_translation_for,
        readyOnly,
        cooldownOnly,
        limit,
        offset,
      });

      return {
        channel_id: channelId,
        questions: result.questions,
        total: result.total,
        limit,
        offset,
      };
    });

    // 4. Global query without channel cooldown
    server.get("/api/question-bank/questions", async (request) => {
      const query = request.query as Record<string, string | undefined>;
      const limit = query.limit ? Number.parseInt(query.limit, 10) : 50;
      const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;

      const result = await deps.repository.queryQuestionBankQuestions({
        archetypeId: query.archetype_id,
        domainId: query.domain_id,
        subtopicId: query.subtopic_id,
        status: query.status,
        search: query.search,
        language: query.language,
        hasTranslationFor: query.has_translation_for,
        limit,
        offset,
      });

      return {
        questions: result.questions,
        total: result.total,
        limit,
        offset,
      };
    });

    // 5. Get question by ID
    server.get("/api/question-bank/questions/:id", async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = request.query as { channel_id?: string };
      const question = await deps.repository.getQuestionBankQuestion(id, query.channel_id);
      if (!question) {
        return reply.code(404).send({ error: `Question not found: ${id}`, code: "QUESTION_NOT_FOUND" });
      }
      return { question };
    });

    // 6. Create new question
    server.post("/api/question-bank/questions", async (request, reply) => {
      const parsed = BankQuestionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid question data",
          code: "VALIDATION_ERROR",
          issues: parsed.error.issues,
        });
      }

      const saved = await deps.repository.saveQuestionBankQuestion(parsed.data);
      return reply.code(201).send({ question: saved });
    });

    // 7. Update question
    server.put("/api/question-bank/questions/:id", async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;

      const existing = await deps.repository.getQuestionBankQuestion(id);
      if (!existing) {
        return reply.code(404).send({ error: `Question not found: ${id}`, code: "QUESTION_NOT_FOUND" });
      }

      const merged = { ...existing, ...body, id };
      const parsed = BankQuestionSchema.safeParse(merged);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid question data",
          code: "VALIDATION_ERROR",
          issues: parsed.error.issues,
        });
      }

      const updated = await deps.repository.saveQuestionBankQuestion(parsed.data);
      return { question: updated };
    });

    // 8. Delete question
    server.delete("/api/question-bank/questions/:id", async (request, reply) => {
      const { id } = request.params as { id: string };
      const deleted = await deps.repository.deleteQuestionBankQuestion(id);
      if (!deleted) {
        return reply.code(404).send({ error: `Question not found: ${id}`, code: "QUESTION_NOT_FOUND" });
      }
      return { ok: true, deleted_id: id };
    });

    const resolveLlmClient = (): LLMClient | undefined => {
      if (deps.llmClient) return deps.llmClient;
      if (deps.state) {
        return deps.state.config.active_engine === "antigravity" && deps.antigravity ? deps.antigravity : (deps.codex ?? deps.antigravity);
      }
      return deps.antigravity ?? deps.codex;
    };

    // 9. AI Batch Generation with Auto-QA
    server.post("/api/question-bank/generate-batch", async (request, reply) => {
      const body = (request.body || {}) as Record<string, unknown>;

      if (!body.archetype_id || typeof body.archetype_id !== "string") {
        return reply.code(400).send({ error: "Missing or invalid archetype_id", code: "INVALID_PARAM" });
      }
      if (!body.domain_id || typeof body.domain_id !== "string") {
        return reply.code(400).send({ error: "Missing or invalid domain_id", code: "INVALID_PARAM" });
      }
      if (!body.subtopic_id || typeof body.subtopic_id !== "string") {
        return reply.code(400).send({ error: "Missing or invalid subtopic_id", code: "INVALID_PARAM" });
      }

      const llmClient = resolveLlmClient();
      if (!llmClient && (!Array.isArray(body.candidates) || body.candidates.length === 0)) {
        return reply.code(503).send({
          error: "No AI engine (Antigravity/Codex) is configured or available to generate questions.",
          code: "AI_CLIENT_UNAVAILABLE",
        });
      }

      const result = await generateQuestionBankBatch(deps.repository, {
        archetypeId: body.archetype_id as any,
        domainId: body.domain_id,
        subtopicId: body.subtopic_id,
        subtopicTitle: typeof body.subtopic_title === "string" ? body.subtopic_title : undefined,
        count: typeof body.count === "number" ? body.count : undefined,
        language: typeof body.language === "string" ? body.language : undefined,
        difficulty: typeof body.difficulty === "number" ? body.difficulty : undefined,
        ageBand: typeof body.age_band === "string" ? (body.age_band as any) : undefined,
        persist: body.persist !== false,
        llmClient,
        rawCandidatesOverride: Array.isArray(body.candidates) ? (body.candidates as any) : undefined,
      });

      return reply.code(200).send(result);
    });

    // 10. 1-Click Video Shorts Episode Creation
    server.post("/api/channels/:channelId/question-bank/create-episode", async (request, reply) => {
      const { channelId } = request.params as { channelId: string };
      const body = (request.body || {}) as Record<string, unknown>;

      if (!body.question_id || typeof body.question_id !== "string") {
        return reply.code(400).send({ error: "Missing or invalid question_id", code: "INVALID_PARAM" });
      }

      try {
        const result = await createEpisodeFromQuestionBank({
          repository: deps.repository,
          tasks: deps.tasks,
          channelId,
          llmClient: deps.llmClient,
          input: {
            question_id: body.question_id,
            target_language: typeof body.target_language === "string" ? body.target_language : undefined,
            render_aspect_ratio: (body.render_aspect_ratio as "9:16" | "16:9") || "9:16",
            auto_start_pipeline: body.auto_start_pipeline !== false,
            visual_style: body.visual_style as any,
            force: body.force === true,
          },
        });

        return reply.code(201).send(result);
      } catch (err: any) {
        if (err?.code === "QUESTION_IN_COOLDOWN") {
          return reply.code(409).send({
            error: err.message,
            code: "QUESTION_IN_COOLDOWN",
          });
        }
        if (err?.code === "QUESTION_NOT_FOUND" || err?.code === "CHANNEL_NOT_FOUND") {
          return reply.code(404).send({
            error: err.message,
            code: err.code,
          });
        }
        throw err;
      }
    });

    // 11. On-Demand Multilingual Transcreation
    server.post("/api/question-bank/:id/transcreate", async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body || {}) as Record<string, unknown>;
      const targetLanguage = typeof body.target_language === "string" ? body.target_language : "vi";
      const channelId = typeof body.channel_id === "string" ? body.channel_id : undefined;

      const question = await deps.repository.getQuestionBankQuestion(id, channelId);
      if (!question) {
        return reply.code(404).send({ error: `Question not found: ${id}`, code: "QUESTION_NOT_FOUND" });
      }

      const transResult = await transcreateBankQuestion(question, {
        targetLanguage,
        channelTone: typeof body.channel_tone === "string" ? body.channel_tone : undefined,
        llmClient: deps.llmClient,
        forceRecreate: body.force === true,
      });

      if (body.persist !== false) {
        await deps.repository.saveQuestionBankTranslation(question.id, transResult.content);
      }

      return reply.code(200).send(transResult);
    });

    done();
  };
}
