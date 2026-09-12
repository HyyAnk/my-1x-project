import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { TopicCandidate, TopicRunResult } from "@studio/shared";
import type { RepositoryService } from "./service.js";
import { type TopicRun } from "./helpers.js";
import type { RepositoryRuntime } from "./runtime.js";
import { projectTopicSelected } from "./topicSelectionProjection.js";
import { extractUniqueCandidates } from "./topicCandidateNormalizer.js";
import { buildTopicRun } from "./topicRunBuilder.js";
import { findLatestTopicRunFile, loadTopicRunsFromDirectory, readTopicRunFile } from "./topicRunReader.js";

export { confirmTopic } from "../context/topicConfirmationService.js";
export {
  getTopicAvailabilityBatch,
  type TopicAvailabilityBatchOptions,
} from "../quiz/bank/topicAvailabilityService.js";
export { updateEpisodeSettings } from "./episodeSettings.js";

export async function listTopics(this: RepositoryRuntime, channelId: string): Promise<TopicCandidate[]> {
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "topics");
  await mkdir(directory, { recursive: true });

  const runs = await loadTopicRunsFromDirectory(directory);
  return extractUniqueCandidates(runs);
}

export async function getLatestTopicRun(
  this: RepositoryRuntime | void,
  repositoryOrChannelId: RepositoryService | RepositoryRuntime | string,
  channelIdParam?: string,
): Promise<TopicRun | null> {
  const repo = (typeof repositoryOrChannelId === "string" ? this : repositoryOrChannelId) as RepositoryRuntime;
  const channelId = typeof repositoryOrChannelId === "string" ? repositoryOrChannelId : channelIdParam!;
  const channel = await repo.getChannel(channelId);
  const directory = repo.resolvePath("channels", channel.slug, "topics");

  await mkdir(directory, { recursive: true });
  const latestFile = await findLatestTopicRunFile(directory);
  if (!latestFile) return null;

  return readTopicRunFile(latestFile.filePath, latestFile.entry.name);
}

export async function saveTopicRun(
  this: RepositoryRuntime,
  channelId: string,
  candidatesOrRun: TopicCandidate[] | TopicRunResult,
): Promise<void> {
  const channel = await this.getChannel(channelId);
  const directory = this.resolvePath("channels", channel.slug, "topics");
  await mkdir(directory, { recursive: true });

  const run = buildTopicRun(candidatesOrRun);
  await this.writeJsonAtomic(path.join(directory, `suggestion-${Date.now()}-${run.run_id}.json`), run);
}

export async function markTopicSelected(this: RepositoryRuntime, channelId: string, topicId: string, questionCount: number): Promise<void> {
  return projectTopicSelected(this, channelId, topicId, questionCount);
}
