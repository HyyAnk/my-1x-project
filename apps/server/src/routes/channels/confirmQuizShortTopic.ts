import { QuizShortTopicConfirmInputSchema, type ConfirmQuizShortTopicResponse } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { TaskManager } from "../../tasks.js";
import type { LLMClient } from "../../utils/promptSanitizer.js";
import { createQuizShortFromTopicWithBank } from "../../quiz/bank/questionBankToQuizBridge.js";

export interface ConfirmQuizShortTopicRouteDeps {
  repository: RepositoryService;
  tasks: TaskManager;
  llmClient?: LLMClient | null;
}

/** The `quiz_short` branch of `POST /api/channels/:channelId/topics/:topicId/confirm`. */
export async function confirmQuizShortTopicRoute(
  deps: ConfirmQuizShortTopicRouteDeps,
  channelId: string,
  topicId: string,
  payload: unknown,
): Promise<ConfirmQuizShortTopicResponse> {
  const body = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const input = QuizShortTopicConfirmInputSchema.parse({ ...body, topic_id: topicId });
  const result = await createQuizShortFromTopicWithBank({
    repository: deps.repository,
    tasks: deps.tasks,
    channelId,
    llmClient: deps.llmClient,
    input: {
      topic_id: topicId,
      question_count: input.question_count,
      visual_style: input.visual_style,
      target_language: input.target_language,
      auto_start_pipeline: input.auto_start_pipeline ?? true,
      render_aspect_ratio: input.render_aspect_ratio,
      layout_pair: input.layout_pair,
      request_id: input.request_id,
    },
  });
  return { content_kind: "quiz_short", ...result };
}
