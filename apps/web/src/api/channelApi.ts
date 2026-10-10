import type { Channel, ConfirmTopicResponse, Task, TopicAvailabilityBatch, TopicCandidate, TopicRun } from "@studio/shared";
import { request } from "./client";
import { buildTopicConfirmPayload, type TopicConfirmRequestOptions } from "./topicConfirmPayload";

export const channelApi = {
  channels: (signal?: AbortSignal) => request<{ channels: Channel[] }>("/api/channels", { signal }),
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
  topics: (id: string) => request<{ topics: TopicCandidate[]; latest_run?: TopicRun | null }>(`/api/channels/${id}/topics`),
  topicAvailability: (id: string, options?: { signal?: AbortSignal }) =>
    request<TopicAvailabilityBatch>(`/api/channels/${id}/topics/availability`, { signal: options?.signal }),
  suggestTopics: (id: string, topicHint?: string) =>
    request<{ task: Task }>(`/api/channels/${id}/topics/suggest`, {
      method: "POST",
      body: JSON.stringify({ topic_hint: topicHint?.trim() || undefined }),
    }),
  confirmTopic: (channelId: string, topic: Pick<TopicCandidate, "topic_id" | "content_kind">, options: TopicConfirmRequestOptions = {}) =>
    request<ConfirmTopicResponse>(`/api/channels/${channelId}/topics/${topic.topic_id}/confirm`, {
      method: "POST",
      body: JSON.stringify(buildTopicConfirmPayload(topic.topic_id, topic.content_kind, options)),
    }),
  deleteTopic: (channelId: string, topicId: string) =>
    request<{ ok: true; topic_id: string }>(`/api/channels/${channelId}/topics/${topicId}`, {
      method: "DELETE",
    }),
  clearTopicHistory: (channelId: string, unselectedOnly: boolean = false) =>
    request<{ ok: true; deleted_count: number }>(`/api/channels/${channelId}/topics/history?unselected_only=${unselectedOnly}`, {
      method: "DELETE",
    }),
};
