import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  BgmHistoryEntrySchema,
  QuestionHistoryEntrySchema,
  nowIso,
  type BgmHistoryEntry,
  type QuestionHistoryEntry,
  type QuizQuestion,
} from "@studio/shared";
import { pruneQuestionHistory, normalizeQuestionText } from "../../quiz/qa/questionHistory.js";
import type { RepositoryRuntime } from "../runtime.js";

export async function readQuestionHistory(this: RepositoryRuntime, channelId: string): Promise<QuestionHistoryEntry[]> {
  const channel = await this.getChannel(channelId);
  const historyPath = this.resolvePath("channels", channel.slug, "question_history.json");
  try {
    const raw = JSON.parse(await readFile(historyPath, "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return pruneQuestionHistory(raw.map((item) => QuestionHistoryEntrySchema.parse(item)));
  } catch {
    return [];
  }
}

export async function appendQuestionHistory(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  questions: QuizQuestion[],
  ttlDays = 30,
  renderTaskId?: string,
): Promise<void> {
  const channel = await this.getChannel(channelId);
  const episode = await this.getEpisode(channelId, episodeId).catch(() => null);
  const episodeTitle = episode?.topic?.title || episodeId;
  const historyPath = this.resolvePath("channels", channel.slug, "question_history.json");
  await queueQuestionHistoryWrite.call(this, channelId, async () => {
    const existing = await this.readQuestionHistory(channelId);
    const filteredExisting = existing.filter((entry) => entry.episode_id !== episodeId);
    const newEntries = questions.map((question): QuestionHistoryEntry => {
      const correctChoice = question.choices.find((choice) => choice.id === question.correct_choice_id)?.text || "";
      return {
        question_id: question.id,
        question_text: question.question,
        normalized_question: normalizeQuestionText(question.question),
        choices: question.choices.map((choice) => choice.text),
        correct_answer: correctChoice,
        episode_id: episodeId,
        episode_title: episodeTitle,
        channel_id: channelId,
        ...(renderTaskId ? { render_task_id: renderTaskId } : {}),
        rendered_at: nowIso(),
      };
    });
    await mkdir(path.dirname(historyPath), { recursive: true });
    await this.writeJsonAtomic(historyPath, pruneQuestionHistory([...filteredExisting, ...newEntries], ttlDays));
  });
}

export async function removeQuestionHistoryEntries(
  this: RepositoryRuntime,
  channelId: string,
  filter: { episodeIds?: string[]; renderTaskIds?: string[] },
  ttlDays = 30,
): Promise<void> {
  const episodeIds = new Set(filter.episodeIds ?? []);
  const renderTaskIds = new Set(filter.renderTaskIds ?? []);
  if (episodeIds.size === 0 && renderTaskIds.size === 0) return;
  const channel = await this.getChannel(channelId);
  const historyPath = this.resolvePath("channels", channel.slug, "question_history.json");
  await queueQuestionHistoryWrite.call(this, channelId, async () => {
    const existing = await this.readQuestionHistory(channelId);
    const retained = existing.filter(
      (entry) => !episodeIds.has(entry.episode_id) && !(entry.render_task_id && renderTaskIds.has(entry.render_task_id)),
    );
    await mkdir(path.dirname(historyPath), { recursive: true });
    await this.writeJsonAtomic(historyPath, pruneQuestionHistory(retained, ttlDays));
  });
}

async function queueQuestionHistoryWrite(this: RepositoryRuntime, channelId: string, operation: () => Promise<void>): Promise<void> {
  const previous = this.questionHistoryWrites.get(channelId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  this.questionHistoryWrites.set(channelId, current);
  try {
    await current;
  } finally {
    if (this.questionHistoryWrites.get(channelId) === current) this.questionHistoryWrites.delete(channelId);
  }
}

export async function readBgmHistory(this: RepositoryRuntime, channelId: string): Promise<BgmHistoryEntry[]> {
  const channel = await this.getChannel(channelId);
  const historyPath = this.resolvePath("channels", channel.slug, "bgm_history.json");
  try {
    const raw = JSON.parse(await readFile(historyPath, "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => BgmHistoryEntrySchema.parse(item));
  } catch {
    return [];
  }
}

export async function appendBgmHistory(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  trackId: string,
  filename: string,
  ttlDays = 30,
): Promise<void> {
  const channel = await this.getChannel(channelId);
  const episode = await this.getEpisode(channelId, episodeId).catch(() => null);
  const episodeTitle = episode?.topic?.title || episodeId;
  const historyPath = this.resolvePath("channels", channel.slug, "bgm_history.json");
  const existing = await this.readBgmHistory(channelId);

  const filteredExisting = existing.filter((e) => e.episode_id !== episodeId);
  const newEntry: BgmHistoryEntry = {
    track_id: trackId,
    filename,
    episode_id: episodeId,
    episode_title: episodeTitle,
    channel_id: channelId,
    used_at: nowIso(),
  };

  const combined = [newEntry, ...filteredExisting];
  const cutOff = Date.now() - ttlDays * 24 * 60 * 60 * 1000;
  const pruned = combined.filter((entry) => {
    const entryTime = new Date(entry.used_at).getTime();
    return !Number.isNaN(entryTime) && entryTime >= cutOff;
  });

  await mkdir(path.dirname(historyPath), { recursive: true });
  await this.writeJsonAtomic(historyPath, pruned);
}
