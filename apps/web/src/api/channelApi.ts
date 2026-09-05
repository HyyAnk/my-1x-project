import type { Channel, Episode, QuizImageStyle, Task, TopicCandidate } from "@studio/shared";
import { request } from "./client";

export const channelApi = {
  channels: () => request<{ channels: Channel[] }>("/api/channels"),
  createChannel: (body: unknown) =>
    request<{ channel: Channel; task: Task | null }>("/api/channels", { method: "POST", body: JSON.stringify(body) }),
  updateChannel: (id: string, body: unknown) => request<Channel>(`/api/channels/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteChannel: (id: string) => request<{ ok: true }>(`/api/channels/${id}?confirm=true`, { method: "DELETE" }),
  dna: (id: string) => request<{ content: string; path: string; modified_at: string }>(`/api/channels/${id}/dna`),
  saveDna: (id: string, content: string) =>
    request<{ path: string; modified_at: string }>(`/api/channels/${id}/dna`, { method: "PUT", body: JSON.stringify({ content }) }),
  generateDna: (id: string) => request<{ task: Task }>(`/api/channels/${id}/dna/generate`, { method: "POST", body: "{}" }),
  resetDnaTemplate: (id: string) =>
    request<{ content: string; path: string; modified_at: string }>(`/api/channels/${id}/dna/reset`, { method: "POST", body: "{}" }),
  topics: (id: string) => request<{ topics: TopicCandidate[] }>(`/api/channels/${id}/topics`),
  suggestTopics: (id: string, topicHint?: string) =>
    request<{ task: Task }>(`/api/channels/${id}/topics/suggest`, {
      method: "POST",
      body: JSON.stringify({ topic_hint: topicHint?.trim() || undefined }),
    }),
  confirmTopic: (
    channelId: string,
    topicId: string,
    questionCount?: number,
    visualStyle?: QuizImageStyle | "mixed",
    autoStartPipeline: boolean = true,
    renderAspectRatio?: "9:16" | "16:9",
  ) =>
    request<{ episode: Episode; task?: Task | null; quiz?: any; director_plan?: any }>(
      `/api/channels/${channelId}/topics/${topicId}/confirm`,
      {
        method: "POST",
        body: JSON.stringify({
          topic_id: topicId,
          question_count: questionCount,
          visual_style: visualStyle,
          auto_start_pipeline: autoStartPipeline,
          render_aspect_ratio: renderAspectRatio,
        }),
      },
    ),
};
