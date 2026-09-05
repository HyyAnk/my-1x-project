import type { FastifyInstance } from "fastify";
import { BankQuestionSchema } from "@studio/shared";
import type { QuestionBankRouteDeps } from "./index.js";

/**
 * Registers CRUD endpoints for creating, updating, deleting, and clearing
 * Question Bank questions.
 */
export function registerCrudRoutes(server: FastifyInstance, deps: QuestionBankRouteDeps): void {
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

  // 8b. Clear all questions from Question Bank
  server.post("/api/question-bank/clear", async () => {
    const result = await deps.repository.clearQuestionBank();
    return { ok: true, ...result };
  });
}
