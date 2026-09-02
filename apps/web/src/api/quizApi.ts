import type {
  DirectorPlan,
  QuestionHistoryCheckResult,
  QuizAssessment,
  QuizAssetPlan,
  QuizTimeline,
  QuizV2,
  SandboxPreviewRequest,
  SandboxPreviewResponse,
  Task,
  VideoDescription,
  VideoDescriptionInput,
  VoicePlan,
} from "@studio/shared";
import { request, type QuizV2State } from "./client";

export const quizApi = {
  quizV2: (channelId: string, episodeId: string) => request<QuizV2State>(`/api/channels/${channelId}/episodes/${episodeId}/quiz-v2`),
  quizHistoryCheck: (channelId: string, episodeId: string) =>
    request<{ history_check: QuestionHistoryCheckResult | null }>(`/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/history-check`),
  remixQuizQuestions: (channelId: string, episodeId: string, questionIds?: string[], mode: "rephrase" | "replace" = "rephrase") =>
    request<{ quiz: QuizV2; history_check: QuestionHistoryCheckResult; remixed_count: number; invalidated: string[] }>(
      `/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/remix`,
      { method: "POST", body: JSON.stringify({ question_ids: questionIds, mode }) },
    ),
  generateQuizV2: (channelId: string, episodeId: string) =>
    request<{ quiz: QuizV2; artifact_path: string; invalidated: string[] }>(
      `/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/generate`,
      { method: "POST", body: "{}" },
    ),
  generateQuizDirector: (channelId: string, episodeId: string) =>
    request<{ director_plan: DirectorPlan; artifact_path: string; invalidated: string[] }>(
      `/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/director/generate`,
      { method: "POST", body: "{}" },
    ),
  planQuizAssets: (channelId: string, episodeId: string) =>
    request<{ asset_plan: QuizAssetPlan; artifact_path: string; invalidated: string[] }>(
      `/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/assets/plan`,
      { method: "POST", body: "{}" },
    ),
  planQuizVoice: (channelId: string, episodeId: string) =>
    request<{ voice_plan: VoicePlan; artifact_path: string; invalidated: string[] }>(
      `/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/voice/plan`,
      { method: "POST", body: "{}" },
    ),
  synthesizeQuizVoice: (channelId: string, episodeId: string) =>
    request<{
      voice_plan: VoicePlan;
      timeline: QuizTimeline;
      narration_asset_path: string;
      narration_duration_seconds: number;
      artifact_path: string;
      timeline_path: string;
      invalidated: string[];
    }>(`/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/voice/generate`, { method: "POST", body: "{}" }),
  compileQuizTimeline: (channelId: string, episodeId: string) =>
    request<{ timeline: QuizTimeline; artifact_path: string; invalidated: string[] }>(
      `/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/timeline/compile`,
      { method: "POST", body: "{}" },
    ),
  assessQuiz: (channelId: string, episodeId: string) =>
    request<{ assessment: QuizAssessment; artifact_path: string }>(`/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/qa`, {
      method: "POST",
      body: "{}",
    }),
  renderQuizVideo: (channelId: string, episodeId: string) =>
    request<{ task: Task }>(`/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/render`, { method: "POST", body: "{}" }),
  previewSandboxComposition: (body: SandboxPreviewRequest) =>
    request<SandboxPreviewResponse>("/api/quiz/preview-composition", { method: "POST", body: JSON.stringify(body) }),
  getVideoDescription: (channelId: string, episodeId: string) =>
    request<{ description: VideoDescription | null }>(`/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/description`),
  generateVideoDescription: (channelId: string, episodeId: string, toneHint?: string, force?: boolean) =>
    request<{ description: VideoDescription; artifact_path: string }>(
      `/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/description/generate`,
      { method: "POST", body: JSON.stringify({ tone_hint: toneHint, force }) },
    ),
  saveVideoDescription: (channelId: string, episodeId: string, input: VideoDescriptionInput) =>
    request<{ description: VideoDescription; artifact_path: string }>(
      `/api/channels/${channelId}/episodes/${episodeId}/quiz-v2/description`,
      { method: "PUT", body: JSON.stringify(input) },
    ),
};
