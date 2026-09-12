import { cp, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { DirectorPlan, Episode, EpisodeTopicCandidate, QuizV2 } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import { writeEpisodeMarkdownStubs } from "./bootstrapperHelpers.js";

/**
 * Moves a staged episode directory to its final location.
 * Uses atomic rename when possible, with cross-device (EXDEV) copy fallback.
 */
export async function publishStagedEpisode(
  stagingDir: string,
  finalDir: string,
  replaceExisting = false,
): Promise<void> {
  if (replaceExisting) {
    await rm(finalDir, { recursive: true, force: true });
  }
  try {
    await rename(stagingDir, finalDir);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "EXDEV") {
      await cp(stagingDir, finalDir, { recursive: true });
      await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    } else {
      throw err;
    }
  }
}

/** Prepares a fresh staging directory with standard subdirectories. */
async function prepareStagingDirectory(stagingDir: string): Promise<void> {
  await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(path.join(stagingDir, "assets"), { recursive: true });
  await mkdir(path.join(stagingDir, "quiz"), { recursive: true });
}

export interface StageAndPublishSingleQuestionParams {
  repository: RepositoryService;
  channelSlug: string;
  parentDir: string;
  episodeSlug: string;
  episode: Episode;
  quiz: QuizV2;
  directorPlan: DirectorPlan;
  localizationArtifact: unknown;
  title: string;
  hook: string;
  premise: string;
}

/**
 * Writes single question episode artifacts into staging and promotes them to the final directory.
 */
export async function stageAndPublishSingleQuestionEpisodeFiles(
  params: StageAndPublishSingleQuestionParams,
): Promise<void> {
  const {
    repository,
    channelSlug,
    parentDir,
    episodeSlug,
    episode,
    quiz,
    directorPlan,
    localizationArtifact,
    title,
    hook,
    premise,
  } = params;

  const stagingDir = repository.resolvePath("channels", channelSlug, ".staging", episodeSlug);
  await prepareStagingDirectory(stagingDir);

  try {
    await repository.writeJsonAtomic(path.join(stagingDir, "episode.json"), episode);
    await repository.writeJsonAtomic(path.join(stagingDir, "quiz", "quiz-v2.json"), quiz);
    await repository.writeJsonAtomic(path.join(stagingDir, "quiz", "director-plan.json"), directorPlan);
    await repository.writeJsonAtomic(path.join(stagingDir, "localization.json"), localizationArtifact);
    await writeEpisodeMarkdownStubs(repository, stagingDir, { title, hook, premise });

    const finalEpisodeDir = path.join(parentDir, episodeSlug);
    await publishStagedEpisode(stagingDir, finalEpisodeDir);
  } catch (stageErr) {
    await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    throw stageErr;
  }
}

export interface StageAndPublishTopicParams {
  repository: RepositoryService;
  channelSlug: string;
  parentDir: string;
  episodeSlug: string;
  episode: Episode;
  quiz: QuizV2;
  directorPlan: DirectorPlan;
  localizationArtifact: unknown;
  sourcesContent: string;
  topic: EpisodeTopicCandidate;
  isPreparingReceipt: boolean;
}

/**
 * Writes topic candidate episode artifacts into staging and promotes them to the final directory.
 */
export async function stageAndPublishTopicEpisodeFiles(
  params: StageAndPublishTopicParams,
): Promise<void> {
  const {
    repository,
    channelSlug,
    parentDir,
    episodeSlug,
    episode,
    quiz,
    directorPlan,
    localizationArtifact,
    sourcesContent,
    topic,
    isPreparingReceipt,
  } = params;

  const stagingDir = repository.resolvePath("channels", channelSlug, ".staging", episodeSlug);
  await prepareStagingDirectory(stagingDir);

  try {
    await repository.writeJsonAtomic(path.join(stagingDir, "episode.json"), episode);
    await repository.writeJsonAtomic(path.join(stagingDir, "quiz", "quiz-v2.json"), quiz);
    await repository.writeJsonAtomic(path.join(stagingDir, "quiz", "director-plan.json"), directorPlan);
    await repository.writeJsonAtomic(path.join(stagingDir, "localization.json"), localizationArtifact);
    await repository.writeTextAtomic(path.join(stagingDir, "sources.md"), sourcesContent);
    await writeEpisodeMarkdownStubs(repository, stagingDir, {
      title: topic.title,
      hook: topic.hook,
      premise: topic.premise,
      isTopic: true,
    });

    const finalEpisodeDir = path.join(parentDir, episodeSlug);
    await publishStagedEpisode(stagingDir, finalEpisodeDir, isPreparingReceipt);
  } catch (stageErr) {
    await rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    throw stageErr;
  }
}
