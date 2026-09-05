import type {
  BankIndex,
  BankQuestion,
  BankQuestionWithCooldown,
  BankTaxonomy,
  BankTranslationContent,
  Episode,
  MatrixCoverageStats,
  Task,
} from "@studio/shared";
import { request } from "./client";
import type {
  QuestionBankBatchGenPayload,
  QuestionBankBatchGenResponse,
  QuestionBankJobState,
} from "../features/questionBank/types/questionBankUi.types";

export const questionBankApi = {
  getQuestionBankTaxonomy: () => request<{ taxonomy: BankTaxonomy }>("/api/question-bank/taxonomy"),

  getQuestionBankStats: () => request<{ stats: BankIndex }>("/api/question-bank/stats"),

  getMatrixCoverageStats: () => request<{ coverage: MatrixCoverageStats }>("/api/question-bank/matrix-coverage"),

  recalculateQuestionBankStats: () =>
    request<{ stats: BankIndex }>("/api/question-bank/stats/recalculate", {
      method: "POST",
      body: "{}",
    }),

  getChannelQuestionBankQuestions: (channelId: string, params: Record<string, string | number | boolean | undefined> = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "") {
        query.append(key, String(val));
      }
    }
    const qs = query.toString();
    return request<{ channel_id: string; questions: BankQuestionWithCooldown[]; total: number }>(
      `/api/channels/${channelId}/question-bank/questions${qs ? `?${qs}` : ""}`,
    );
  },

  getQuestionBankQuestions: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const query = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "") {
        query.append(key, String(val));
      }
    }
    const qs = query.toString();
    return request<{ questions: BankQuestionWithCooldown[]; total: number }>(`/api/question-bank/questions${qs ? `?${qs}` : ""}`);
  },

  getQuestionBankQuestion: (id: string) =>
    request<{ question: BankQuestionWithCooldown }>(`/api/question-bank/questions/${encodeURIComponent(id)}`),

  createQuestionBankQuestion: (question: BankQuestion) =>
    request<{ question: BankQuestion }>("/api/question-bank/questions", {
      method: "POST",
      body: JSON.stringify(question),
    }),

  updateQuestionBankQuestion: (id: string, patch: Partial<BankQuestion>) =>
    request<{ question: BankQuestion }>(`/api/question-bank/questions/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  deleteQuestionBankQuestion: (id: string) =>
    request<{ ok: boolean; deleted_id: string }>(`/api/question-bank/questions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  clearQuestionBank: () =>
    request<{ ok: boolean; cleared_batches_count: number }>("/api/question-bank/clear", {
      method: "POST",
    }),

  generateQuestionBankBatch: (payload: QuestionBankBatchGenPayload) =>
    request<QuestionBankBatchGenResponse>("/api/question-bank/generate-batch", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getBatchGenerationStatus: () =>
    request<{ job: QuestionBankJobState }>("/api/question-bank/generate-batch/status"),

  cancelBatchGeneration: () =>
    request<{ success: boolean; job: QuestionBankJobState }>("/api/question-bank/generate-batch/cancel", {
      method: "POST",
    }),

  dismissBatchGeneration: () =>
    request<{ success: boolean; job: QuestionBankJobState }>("/api/question-bank/generate-batch/dismiss", {
      method: "POST",
    }),

  createOneClickVideo: (
    channelId: string,
    payload: {
      question_id: string;
      render_aspect_ratio?: "9:16" | "16:9";
      auto_start_pipeline?: boolean;
      visual_style?: string;
      force?: boolean;
    },
  ) =>
    request<{ episode: Episode; task?: Task | null; cooldown_recorded: boolean }>(
      `/api/channels/${encodeURIComponent(channelId)}/question-bank/create-episode`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),

  transcreateQuestion: (
    id: string,
    payload: {
      target_language?: string;
      channel_id?: string;
      channel_tone?: string;
      force?: boolean;
      persist?: boolean;
    } = {},
  ) =>
    request<{
      success: boolean;
      cached: boolean;
      language: string;
      content: BankTranslationContent;
    }>(`/api/question-bank/${encodeURIComponent(id)}/transcreate`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
