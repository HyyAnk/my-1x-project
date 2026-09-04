import { readFile } from "node:fs/promises";
import type { ContextManifest } from "@studio/shared";
import { isPlaceholderArtifact } from "../tasks/validators.js";
import { buildOutputContract } from "../contextContracts.js";
import type { ContextFile } from "./contextTypes.js";
import { composeContextPrompt, finalizeContextManifest, readRuntimeConfig } from "./contextManifestFinalizer.js";
import { loadPipelineArtifacts, type ArtifactContext } from "./pipelineArtifactLoader.js";
import { loadShotArtifacts, type EpisodeContextInput } from "./shotArtifactLoader.js";

export { type EpisodeContextInput } from "./shotArtifactLoader.js";

export async function buildEpisodeContext(input: EpisodeContextInput): Promise<ContextManifest> {
  const { repository, logger, channel, episode, taskType, channelId, episodeId, sceneNumber } = input;
  const files: ContextFile[] = [];
  const sharedFiles: ContextFile[] = [];
  const excluded = ["other channels", "full unrelated episodes", "raw task history", "secrets and credentials"];

  const add = (file: ContextFile) => files.push(file);
  const dnaPath = `channels/${channel.slug}/channel_dna.md`;
  const stylePath = `channels/${channel.slug}/style_guide.md`;

  let dna = "";
  try {
    dna = await readFile(repository.resolveContextPath(dnaPath), "utf8");
    add({ path: dnaPath, reason: "active channel DNA", content: dna });
  } catch {
    // optional
  }

  const briefFile = await repository.getEpisodeFile(channelId, episodeId, "brief.md");
  add({ path: briefFile.path, reason: "confirmed episode brief", content: briefFile.content });

  const loadArtifact = async (filename: string, required = false) => {
    const file = await repository.getEpisodeFile(channelId, episodeId, filename);
    if (required && isPlaceholderArtifact(file.content)) {
      throw new Error(`${filename} must be ready before ${taskType}`);
    }
    return file;
  };

  const artifact = async (filename: string, reason: string, required = false) => {
    const file = await loadArtifact(filename, required);
    if (!isPlaceholderArtifact(file.content)) {
      add({ path: file.path, reason, content: file.content });
    }
    return file.content;
  };

  const runtimeConfig = await readRuntimeConfig(repository);
  const quizQuestionCount = episode.quiz_config.question_count;
  const quizLastClaimId = `C${String(quizQuestionCount).padStart(2, "0")}`;
  const quizSourceMinimum = Math.max(3, Math.ceil(quizQuestionCount / 2));

  const ctx: ArtifactContext = {
    files,
    sharedFiles,
    dna,
    dnaPath,
    stylePath,
    runtimeConfig,
    add,
    loadArtifact,
    artifact,
  };

  if (
    taskType === "GENERATE_QUIZ" ||
    taskType === "GENERATE_RESEARCH" ||
    taskType === "GENERATE_TREATMENT" ||
    taskType === "GENERATE_SCRIPT" ||
    taskType === "GENERATE_VISUAL_BIBLE"
  ) {
    await loadPipelineArtifacts(taskType, repository, ctx);
  } else {
    await loadShotArtifacts(input, ctx);
  }

  const outputContract = buildOutputContract({
    taskType,
    episode,
    sceneNumber,
    quizQuestionCount,
    quizLastClaimId,
    quizSourceMinimum,
  });

  const prompt = composeContextPrompt(taskType, channel, episode, [...files, ...sharedFiles], {
    scene_number: sceneNumber ?? null,
    target_duration_minutes: episode.target_duration_minutes,
    target_word_count: episode.target_word_count,
    output_contract: outputContract,
  });

  return finalizeContextManifest(
    repository,
    logger,
    taskType,
    channelId,
    episodeId,
    [...files, ...sharedFiles],
    excluded.concat("other scenes outside immediate neighbors"),
    prompt,
  );
}
