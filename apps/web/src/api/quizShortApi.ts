import type {
  DirectorPlan,
  QuizAssessment,
  QuizShort,
  QuizShortCoverManifest,
  QuizShortSettingsInput,
  QuizStageTimings,
  QuizTimeline,
  QuizV2,
  Task,
  VideoDescription,
  VideoDescriptionInput,
  VideoTitle,
  VideoTitleInput,
} from "@studio/shared";
import { request } from "./client";

export type QuizShortStageState = "not_started" | "ready" | "stale" | "running" | "failed";

export type QuizShortWorkspaceStages = Record<"questions" | "director" | "timeline" | "qa" | "render", QuizShortStageState>;

export type QuizShortWorkspaceResponse = {
  quiz_short: QuizShort;
  quiz: QuizV2 | null;
  director_plan: DirectorPlan | null;
  timeline: QuizTimeline | null;
  assessment: QuizAssessment | null;
  timings: QuizStageTimings | null;
  render_stale: boolean;
  stages: QuizShortWorkspaceStages;
};

const base = (channelId: string, quizShortId: string) =>
  `/api/channels/${encodeURIComponent(channelId)}/quiz-shorts/${encodeURIComponent(quizShortId)}`;

export const quizShortApi = {
  listQuizShorts: (channelId: string) =>
    request<{ quiz_shorts: QuizShort[] }>(`/api/channels/${encodeURIComponent(channelId)}/quiz-shorts`),
  getQuizShort: (channelId: string, quizShortId: string) => request<QuizShort>(base(channelId, quizShortId)),
  updateQuizShortSettings: (channelId: string, quizShortId: string, body: QuizShortSettingsInput) =>
    request<QuizShort>(base(channelId, quizShortId), { method: "PATCH", body: JSON.stringify(body) }),
  deleteQuizShort: (channelId: string, quizShortId: string) =>
    request<{ ok: true }>(`${base(channelId, quizShortId)}?confirm=true`, { method: "DELETE" }),
  startQuizShortPipeline: (channelId: string, quizShortId: string) =>
    request<Task>(`${base(channelId, quizShortId)}/pipeline`, { method: "POST", body: "{}" }),
  quizShortWorkspace: (channelId: string, quizShortId: string) =>
    request<QuizShortWorkspaceResponse>(`${base(channelId, quizShortId)}/workspace`),
  quizShortRenderManifest: (channelId: string, quizShortId: string) =>
    request<{ manifest: unknown }>(`${base(channelId, quizShortId)}/render-manifest`),
  quizShortVideoUrl: (channelId: string, quizShortId: string, version?: string | null) =>
    `${base(channelId, quizShortId)}/video${version ? `?v=${encodeURIComponent(version)}` : ""}`,
  getQuizShortTitle: (channelId: string, quizShortId: string) =>
    request<{ title: VideoTitle | null }>(`${base(channelId, quizShortId)}/title`),
  generateQuizShortTitle: (channelId: string, quizShortId: string, toneHint?: string) =>
    request<{ title: VideoTitle; description: VideoDescription | null; artifact_path: string }>(
      `${base(channelId, quizShortId)}/title/generate`,
      {
        method: "POST",
        body: JSON.stringify({ tone_hint: toneHint }),
      },
    ),
  saveQuizShortTitle: (channelId: string, quizShortId: string, input: VideoTitleInput) =>
    request<{ title: VideoTitle; description: VideoDescription | null; artifact_path: string }>(`${base(channelId, quizShortId)}/title`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  getQuizShortDescription: (channelId: string, quizShortId: string) =>
    request<{ description: VideoDescription | null }>(`${base(channelId, quizShortId)}/description`),
  generateQuizShortDescription: (channelId: string, quizShortId: string, toneHint?: string, force?: boolean) =>
    request<{ description: VideoDescription; artifact_path: string }>(`${base(channelId, quizShortId)}/description/generate`, {
      method: "POST",
      body: JSON.stringify({ tone_hint: toneHint, force }),
    }),
  saveQuizShortDescription: (channelId: string, quizShortId: string, input: VideoDescriptionInput) =>
    request<{ description: VideoDescription; artifact_path: string }>(`${base(channelId, quizShortId)}/description`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  getQuizShortThumbnail: (channelId: string, quizShortId: string) =>
    request<{ manifest: QuizShortCoverManifest | null }>(`${base(channelId, quizShortId)}/thumbnail`),
  generateQuizShortThumbnail: (channelId: string, quizShortId: string) =>
    request<{ ok: true; manifest: QuizShortCoverManifest }>(`${base(channelId, quizShortId)}/thumbnail/generate`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  quizShortThumbnailFileUrl: (channelId: string, quizShortId: string, version?: string | null) =>
    `${base(channelId, quizShortId)}/thumbnail/file${version ? `?t=${encodeURIComponent(version)}` : ""}`,
};
