import type { FastifyInstance } from "fastify";
import type { QuizImageStyle } from "@studio/shared";
import { createEpisodeFromQuestionBank } from "../../quiz/bank/questionBankToQuizBridge.js";
import type { QuestionBankRouteDeps } from "./index.js";

/**
 * Registers episode creation routes connecting Question Bank questions with video generation pipelines.
 */
export function registerBuildRoutes(server: FastifyInstance, deps: QuestionBankRouteDeps): void {
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
          render_aspect_ratio: "16:9",
          auto_start_pipeline: body.auto_start_pipeline !== false,
          visual_style: typeof body.visual_style === "string" ? (body.visual_style as QuizImageStyle | "mixed") : undefined,
          force: body.force === true,
        },
      });

      return reply.code(201).send(result);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const customErr = err as { code?: string; message?: string };
        if (customErr.code === "QUESTION_IN_COOLDOWN") {
          return reply.code(409).send({
            error: customErr.message,
            code: "QUESTION_IN_COOLDOWN",
          });
        }
        if (customErr.code === "QUESTION_NOT_FOUND" || customErr.code === "CHANNEL_NOT_FOUND") {
          return reply.code(404).send({
            error: customErr.message,
            code: customErr.code,
          });
        }
      }
      throw err;
    }
  });

  // 11. Retired Bank transcreation endpoint. Keep the route for an explicit migration response.
  server.post("/api/question-bank/:id/transcreate", async (request, reply) => {
    return reply.code(410).send({
      error: "Question Bank transcreation has been retired; Bank content is English-only",
      code: "BANK_TRANSCREATION_RETIRED",
    });
  });
}
