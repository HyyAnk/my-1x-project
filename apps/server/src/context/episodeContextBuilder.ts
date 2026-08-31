import { readFile } from "node:fs/promises";
import type { ContextManifest } from "@studio/shared";
import { calibratedScriptTargetWords, scriptWordBounds } from "../production.js";
import { extractArtifactSectionNumbers } from "../artifactSections.js";
import { isPlaceholderArtifact } from "../tasks/validators.js";
import { buildOutputContract, humorGuidanceForDuration, sequenceGuidanceForDuration } from "../contextContracts.js";
import type { ContextFile } from "./contextTypes.js";
import { composeContextPrompt, finalizeContextManifest, readRuntimeConfig } from "./contextManifestFinalizer.js";
import { loadPipelineArtifacts, type ArtifactContext } from "./pipelineArtifactLoader.js";
import { loadShotArtifacts, type EpisodeContextInput } from "./shotArtifactLoader.js";

export { type EpisodeContextInput } from "./shotArtifactLoader.js";

export async function buildEpisodeContext(input: EpisodeContextInput): Promise<ContextManifest> {
  const { repository, logger, channel, episode, taskType, channelId, episodeId, sceneNumber } = input;
  const isQuiz = channel.engine === "quiz" || channel.group_id === "quiz";
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
  const narrationWordsPerSecond = runtimeConfig.video_generation?.narration_words_per_second ?? 2.3;
  const calibratedTargetWords = calibratedScriptTargetWords(episode, narrationWordsPerSecond);
  const scriptBounds = scriptWordBounds(calibratedTargetWords);
  const maxBeatWords = Math.max(
    1,
    Math.floor(
      (runtimeConfig.video_generation?.max_scene_duration_seconds ?? 8) *
        (episode.measured_narration_words_per_second ?? runtimeConfig.video_generation?.narration_words_per_second ?? 2.3),
    ),
  );
  const humorGuidance = humorGuidanceForDuration(episode.target_duration_minutes);
  const sequenceGuidance = sequenceGuidanceForDuration(episode.target_duration_minutes);
  const quizQuestionCount = episode.quiz_config.question_count;
  const quizLastClaimId = `C${String(quizQuestionCount).padStart(2, "0")}`;
  const quizSourceMinimum = Math.max(3, Math.ceil(quizQuestionCount / 2));

  const ctx: ArtifactContext = {
    files,
    sharedFiles,
    dna,
    dnaPath,
    stylePath,
    isQuiz,
    runtimeConfig,
    add,
    loadArtifact,
    artifact,
  };

  if (
    taskType === "GENERATE_RESEARCH" ||
    taskType === "GENERATE_TREATMENT" ||
    taskType === "GENERATE_SCRIPT" ||
    taskType === "GENERATE_VISUAL_BIBLE"
  ) {
    await loadPipelineArtifacts(taskType, repository, ctx);
  } else {
    await loadShotArtifacts(input, ctx);
  }

  const treatmentForPrompt = files.find((file) => file.path.endsWith("/treatment.md"))?.content ?? "";
  const treatmentKind = isQuiz ? "question" : "sequence";
  const requiredBundleNumbers = extractArtifactSectionNumbers(treatmentForPrompt, treatmentKind);
  const requiredBundleInstruction = requiredBundleNumbers.length
    ? `Create exactly ${requiredBundleNumbers.length} continuity bundles with IDs ${requiredBundleNumbers.map((number) => `CB-${String(number).padStart(2, "0")}`).join(", ")}, one bundle for every upstream ${isQuiz ? "question" : "sequence"}.`
    : "Create one continuity bundle for every upstream sequence in order.";

  const outputContract = buildOutputContract({
    taskType,
    isQuiz,
    episode,
    sceneNumber,
    quizQuestionCount,
    quizLastClaimId,
    quizSourceMinimum,
    calibratedTargetWords,
    narrationWordsPerSecond,
    scriptBounds,
    humorGuidance,
    sequenceGuidance,
    requiredBundleInstruction,
    maxBeatWords,
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
