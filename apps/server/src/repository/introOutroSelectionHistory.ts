import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { nowIso } from "@studio/shared";
import { RepositoryError } from "./errors.js";
import type { RepositoryRuntime } from "./runtime.js";

type IntroOutroSelectionHistoryEntry = {
  task_id: string;
  episode_id: string;
  style_preset_id: string;
  style_id: string;
  selected_at: string;
};

function tieBreaker(taskId: string, styleId: string): string {
  return createHash("sha256").update(`${taskId}:${styleId}`).digest("hex");
}

function selectLeastRecentlyUsed(
  candidates: readonly string[],
  history: readonly IntroOutroSelectionHistoryEntry[],
  taskId: string,
): string {
  const recentIndex = new Map<string, number>();
  history.forEach((entry, index) => {
    if (!recentIndex.has(entry.style_id)) recentIndex.set(entry.style_id, index);
  });

  return [...candidates].sort((left, right) => {
    const leftIndex = recentIndex.get(left);
    const rightIndex = recentIndex.get(right);
    if (leftIndex === undefined && rightIndex !== undefined) return -1;
    if (leftIndex !== undefined && rightIndex === undefined) return 1;
    if (leftIndex !== undefined && rightIndex !== undefined && leftIndex !== rightIndex) return rightIndex - leftIndex;
    return tieBreaker(taskId, left).localeCompare(tieBreaker(taskId, right));
  })[0];
}

async function readHistory(repository: RepositoryRuntime, channelId: string): Promise<IntroOutroSelectionHistoryEntry[]> {
  const channel = await repository.getChannel(channelId);
  const historyPath = repository.resolvePath("channels", channel.slug, "intro_outro_selection_history.json");
  try {
    const parsed = JSON.parse(await readFile(historyPath, "utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as IntroOutroSelectionHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function reserveChannelIntroOutroStyle(
  this: RepositoryRuntime,
  channelId: string,
  episodeId: string,
  taskId: string,
  stylePresetId: string,
  candidateStyleIds: readonly string[],
): Promise<string> {
  if (candidateStyleIds.length === 0) {
    throw new RepositoryError(`No ready Intro/Outro pairs for preset "${stylePresetId}"`, "INTRO_OUTRO_CATEGORY_EMPTY");
  }

  const queueKey = channelId;
  const previous = this.introOutroSelectionWrites.get(queueKey) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      const history = await readHistory(this, channelId);
      const existing = history.find((entry) => entry.task_id === taskId && candidateStyleIds.includes(entry.style_id));
      if (existing) return existing.style_id;

      const presetHistory = history.filter((entry) => entry.style_preset_id === stylePresetId);
      const selectedStyleId = selectLeastRecentlyUsed(candidateStyleIds, presetHistory, taskId);
      const channel = await this.getChannel(channelId);
      const historyPath = this.resolvePath("channels", channel.slug, "intro_outro_selection_history.json");
      const nextEntry: IntroOutroSelectionHistoryEntry = {
        task_id: taskId,
        episode_id: episodeId,
        style_preset_id: stylePresetId,
        style_id: selectedStyleId,
        selected_at: nowIso(),
      };
      await mkdir(path.dirname(historyPath), { recursive: true });
      await this.writeJsonAtomic(historyPath, [nextEntry, ...history.filter((entry) => entry.task_id !== taskId)].slice(0, 500));
      return selectedStyleId;
    });

  const tail = current.then(() => undefined);
  this.introOutroSelectionWrites.set(queueKey, tail);
  return current.finally(() => {
    if (this.introOutroSelectionWrites.get(queueKey) === tail) this.introOutroSelectionWrites.delete(queueKey);
  });
}
