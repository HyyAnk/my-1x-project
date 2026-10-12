import type { QuizShortBookendCategorySummary, QuizShortBookendKind, QuizShortBookendPair, QuizShortTitleCanvas } from "@studio/shared";
import { request } from "./client";

export type CreateQuizShortBookendPairPayload = {
  pair_id: string;
  style_preset_id: string;
  intro_data: string;
  outro_data: string;
  outro_keep_audio: boolean;
};

export type UpdateQuizShortBookendPairPayload = {
  style_preset_id?: string;
  status?: "active" | "disabled";
  title_canvas?: QuizShortTitleCanvas;
};

const base = (channelId: string) => `/api/channels/${encodeURIComponent(channelId)}/quiz-short-bookends`;
const pairUrl = (channelId: string, pairId: string) => `${base(channelId)}/${encodeURIComponent(pairId)}`;

export const quizShortBookendApi = {
  listPairs: (channelId: string): Promise<{ pairs: QuizShortBookendPair[] }> => request(base(channelId)),

  listCategories: (channelId: string): Promise<{ categories: QuizShortBookendCategorySummary[] }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/quiz-short-bookend-categories`),

  createPair: (channelId: string, payload: CreateQuizShortBookendPairPayload): Promise<{ pair: QuizShortBookendPair }> =>
    request(base(channelId), { method: "POST", body: JSON.stringify(payload) }),

  updatePair: (channelId: string, pairId: string, payload: UpdateQuizShortBookendPairPayload): Promise<{ pair: QuizShortBookendPair }> =>
    request(pairUrl(channelId, pairId), { method: "PATCH", body: JSON.stringify(payload) }),

  deletePair: (channelId: string, pairId: string): Promise<{ ok: boolean }> => request(pairUrl(channelId, pairId), { method: "DELETE" }),

  clipUrl: (channelId: string, pairId: string, kind: QuizShortBookendKind): string => `${pairUrl(channelId, pairId)}/clips/${kind}`,

  thumbUrl: (channelId: string, pairId: string, kind: QuizShortBookendKind): string => `${pairUrl(channelId, pairId)}/thumbs/${kind}`,
};
