import type { Channel, Task } from "@studio/shared";
import type { TaskManagerRuntime, ActiveRun } from "../runtime.js";
import { extractNarrationSections } from "../../production.js";
import { optimizeShortScenes, packBeatsIntoScenes } from "../../sceneTiming.js";
import { parseContinuityBundles } from "../../visualBundles.js";
import { parseBeatsOutput, parseRegeneration } from "../parsers.js";
import { normalizeQuizBeatMetadata } from "../normalizers.js";
import { validateBeatOutput, validateNarrationCoverage } from "../validators.js";

export async function handleBundleImageOutput(runtime: TaskManagerRuntime, active: ActiveRun, output: string): Promise<string[]> {
  const task = active.task;
  if (!runtime.imageConfig.enabled) throw new Error("Image generation is disabled in Settings");
  const bundleNumber = runtime.findSceneNumber(task.task_id);
  if (!bundleNumber) throw new Error("Bundle number is required");
  const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
  const imageTarget = {
    channelId: task.channel_id,
    episodeId: task.episode_id!,
    bundleNumber,
    variant: runtime.imageVariants.get(task.task_id) ?? 0,
    theme: episode.quiz_config?.visual_theme,
  };
  const visualBible = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "visual_bible.md").catch(() => null);
  let promptToUse = active.manifest.prompt;
  if (visualBible?.content) {
    const bundles = parseContinuityBundles(visualBible.content);
    const bundle = bundles.find((b) => b.bundle_number === bundleNumber);
    if (bundle?.anchor_prompt) {
      promptToUse = bundle.anchor_prompt;
    }
  }
  const { image } = await runtime.generateBundleImageWithSafetyRetry(
    task,
    imageTarget,
    promptToUse,
    undefined,
    output,
    visualBible?.content,
  );
  const bundleId = `CB-${String(bundleNumber).padStart(2, "0")}`;
  await runtime.repository.attachBundleReference(task.channel_id, task.episode_id!, bundleId, image.asset_path);
  return [image.asset_path];
}

export async function handleSequenceScenesOutput(
  runtime: TaskManagerRuntime,
  active: ActiveRun,
  channel: Channel,
  output: string,
): Promise<string[]> {
  const task = active.task;
  const isQuiz = channel.engine === "quiz";
  const sequenceNumber = runtime.findSceneNumber(task.task_id);
  if (!sequenceNumber) throw new Error("Sequence number is required");
  const parsedBeats = parseBeatsOutput(output);
  const beats = isQuiz
    ? normalizeQuizBeatMetadata(parsedBeats)
    : parsedBeats.map((beat) => {
        if (beat.source_ids.length === 0 && beat.asset_type !== "transition") {
          return { ...beat, source_ids: [`C${String(sequenceNumber).padStart(2, "0")}`] };
        }
        return beat;
      });
  validateBeatOutput(beats, 1, isQuiz);
  const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
  const script = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "script.md");
  const scriptSections = extractNarrationSections(script.content);
  const section = scriptSections[sequenceNumber - 1];
  if (!section) throw new Error(`Script sequence ${sequenceNumber} was not found`);
  validateNarrationCoverage(section.text, beats, 0.975);
  const scenes = optimizeShortScenes(
    packBeatsIntoScenes(
      beats,
      runtime.videoConfig.max_scene_duration_seconds,
      episode.measured_narration_words_per_second ?? runtime.videoConfig.narration_words_per_second,
      task.episode_id!,
    ),
    runtime.videoConfig.max_scene_duration_seconds,
    task.episode_id!,
  );
  await runtime.repository.saveSequenceDraft(task.episode_id!, sequenceNumber, scenes);
  let outputFiles = [`.documentary-studio/shot-drafts/${task.episode_id}/sequence-${String(sequenceNumber).padStart(2, "0")}.json`];
  if (!runtime.assemblingEpisodes.has(task.episode_id!)) {
    const drafts = await runtime.repository.readSequenceDrafts(task.episode_id!);
    if (drafts.length === scriptSections.length && !runtime.assemblingEpisodes.has(task.episode_id!)) {
      runtime.assemblingEpisodes.add(task.episode_id!);
      try {
        if (await runtime.repository.commitSequenceDrafts(task.channel_id, task.episode_id!, scriptSections.length)) {
          const updatedChannel = await runtime.repository.getChannel(task.channel_id);
          outputFiles = [`channels/${updatedChannel.slug}/episodes/${episode.slug}/scene_plan.md`];
        }
      } finally {
        runtime.assemblingEpisodes.delete(task.episode_id!);
      }
    }
  }
  return outputFiles;
}

export async function handleAllScenesOutput(
  runtime: TaskManagerRuntime,
  active: ActiveRun,
  channel: Channel,
  output: string,
): Promise<string[]> {
  const task = active.task;
  const isQuiz = channel.engine === "quiz";
  const parsedBeats = parseBeatsOutput(output);
  const beats = isQuiz
    ? normalizeQuizBeatMetadata(parsedBeats)
    : parsedBeats.map((beat, idx) => {
        if (beat.source_ids.length === 0 && beat.asset_type !== "transition") {
          const seqMatch = beat.sequence_id.match(/\d+/);
          const seqNum = seqMatch ? Number(seqMatch[0]) : idx + 1;
          return { ...beat, source_ids: [`C${String(seqNum).padStart(2, "0")}`] };
        }
        return beat;
      });
  validateBeatOutput(beats, 5, isQuiz);
  const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
  const script = await runtime.repository.getEpisodeFile(task.channel_id, task.episode_id!, "script.md");
  validateNarrationCoverage(script.content, beats, 0.975);
  const scenes = optimizeShortScenes(
    packBeatsIntoScenes(
      beats,
      runtime.videoConfig.max_scene_duration_seconds,
      episode.measured_narration_words_per_second ?? runtime.videoConfig.narration_words_per_second,
      task.episode_id!,
    ),
    runtime.videoConfig.max_scene_duration_seconds,
    task.episode_id!,
  );
  await runtime.repository.saveScenes(task.channel_id, task.episode_id!, scenes);
  const persistedEpisode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
  const updatedChannel = await runtime.repository.getChannel(task.channel_id);
  return [
    `channels/${updatedChannel.slug}/episodes/${persistedEpisode.slug}/scene_plan.md`,
    `channels/${updatedChannel.slug}/episodes/${persistedEpisode.slug}/dialogue_script.md`,
    `channels/${updatedChannel.slug}/episodes/${persistedEpisode.slug}/video_prompts.md`,
  ];
}

export async function handleRegenerateSceneOutput(runtime: TaskManagerRuntime, active: ActiveRun, output: string): Promise<string[]> {
  const task = active.task;
  const scenes = await runtime.repository.readScenes(task.channel_id, task.episode_id!);
  const targetNumber = runtime.findSceneNumber(task.task_id);
  const current = scenes.find((scene) => scene.scene_number === targetNumber);
  if (!current) throw new Error("Regeneration target scene not found");
  const parsed = parseRegeneration(output);
  const next = scenes.map((scene) => (scene.scene_number === targetNumber ? { ...scene, ...parsed } : scene));
  await runtime.repository.backupEpisodeFile(task.channel_id, task.episode_id!, "scene_plan.md");
  await runtime.repository.saveScenes(task.channel_id, task.episode_id!, next);
  const episode = await runtime.repository.getEpisode(task.channel_id, task.episode_id!);
  const channel = await runtime.repository.getChannel(task.channel_id);
  return [`channels/${channel.slug}/episodes/${episode.slug}/scene_plan.md`];
}
