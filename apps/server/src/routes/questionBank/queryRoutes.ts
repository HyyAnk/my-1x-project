import type { FastifyInstance } from "fastify";
import { clearKnowledgeBaseCache } from "../../quiz/bank/knowledgeBaseLoader.js";
import type { QuestionBankRouteDeps } from "./index.js";

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
}
