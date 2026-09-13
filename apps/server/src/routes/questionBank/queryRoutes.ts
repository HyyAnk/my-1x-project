import type { FastifyInstance } from "fastify";
import type { BankCooldownScope } from "../../repository/quiz/bank/bankQueryEngine.js";
import { clearKnowledgeBaseCache } from "../../quiz/bank/knowledgeBaseLoader.js";
import type { QuestionBankRouteDeps } from "./index.js";

function parseCooldownScope(rawScope: unknown): { scope?: BankCooldownScope; error?: string } {
  if (rawScope === undefined || rawScope === null || rawScope === "") {
    return { scope: undefined };
  }
  if (rawScope === "all" || rawScope === "episode" || rawScope === "short_reel") {
    return { scope: rawScope };
  }
  const scopeStr = typeof rawScope === "string" ? rawScope : JSON.stringify(rawScope);
  return { error: `Invalid scope "${scopeStr}". Expected "all", "episode", or "short_reel".` };
}

/**
 * Registers query endpoints for Question Bank taxonomy, stats, matrix coverage,
 * channel-scoped cooldown queries, and individual question retrieval.
 */
export function registerQueryRoutes(server: FastifyInstance, deps: QuestionBankRouteDeps): void {
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
    clearKnowledgeBaseCache();
    const stats = await deps.repository.recalculateQuestionBankIndex();
    return { stats };
  });

  // 2.1 Matrix Coverage Stats
  server.get("/api/question-bank/matrix-coverage", async () => {
    const coverage = await deps.repository.getQuestionBankMatrixCoverage();
    return { coverage };
  });

  // 3. Query questions with Channel-scoped Cooldown
  server.get("/api/channels/:channelId/question-bank/questions", async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const query = request.query as Record<string, string | undefined>;

    const limit = query.limit ? Number.parseInt(query.limit, 10) : 50;
    const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;
    const readyOnly = query.ready_only === "true" || query.ready_only === "1";
    const cooldownOnly = query.cooldown_only === "true" || query.cooldown_only === "1";

    const scopeParsed = parseCooldownScope(query.scope);
    if (scopeParsed.error) {
      return reply.code(400).send({ error: scopeParsed.error, code: "INVALID_SCOPE" });
    }

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
      scope: scopeParsed.scope,
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
  server.get("/api/question-bank/questions", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const limit = query.limit ? Number.parseInt(query.limit, 10) : 50;
    const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;

    const scopeParsed = parseCooldownScope(query.scope);
    if (scopeParsed.error) {
      return reply.code(400).send({ error: scopeParsed.error, code: "INVALID_SCOPE" });
    }

    const result = await deps.repository.queryQuestionBankQuestions({
      archetypeId: query.archetype_id,
      domainId: query.domain_id,
      subtopicId: query.subtopic_id,
      status: query.status,
      search: query.search,
      language: query.language,
      hasTranslationFor: query.has_translation_for,
      scope: scopeParsed.scope,
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
    const query = request.query as { channel_id?: string; scope?: string };

    const scopeParsed = parseCooldownScope(query.scope);
    if (scopeParsed.error) {
      return reply.code(400).send({ error: scopeParsed.error, code: "INVALID_SCOPE" });
    }

    const question = await deps.repository.getQuestionBankQuestion(id, query.channel_id, scopeParsed.scope);
    if (!question) {
      return reply.code(404).send({ error: `Question not found: ${id}`, code: "QUESTION_NOT_FOUND" });
    }
    return { question };
  });
}
