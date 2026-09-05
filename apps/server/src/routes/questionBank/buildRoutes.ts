import type { FastifyInstance } from "fastify";
import { createEpisodeFromQuestionBank } from "../../quiz/bank/questionBankToQuizBridge.js";
import { transcreateBankQuestion } from "../../quiz/bank/transcreation/transcreationEngine.js";
import type { QuestionBankRouteDeps } from "./index.js";

/**
 * Registers episode creation and transcreation routes connecting Question Bank
 * questions with video generation pipelines and multi-language adaptation.
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
}
