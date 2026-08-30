import { readFile } from "node:fs/promises";
import path from "node:path";
import { BUILTIN_DEFAULT_VOICE_PROFILE, nowIso, type Task } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import { synthesizeWav } from "../providers/chatterbox.js";
import { countWords, extractNarration, extractNarrationChunks, extractNarrationSections } from "../production.js";
import { quizVoiceTargetWordsPerSecond } from "../quiz/audio/voicePolicy.js";
import { runConcurrent } from "../utils/concurrency.js";
import { readNarrationCheckpoint, writeNarrationCheckpoint, type NarrationCheckpoint } from "./checkpoints.js";
import { narrationSegmentFingerprint } from "./fingerprints.js";
import { parseWavDuration } from "./parsers.js";
import { validateNarrationSegmentDuration } from "./validators.js";
import type { TaskManagerRuntime } from "./runtime.js";

export async function runAudioTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  const context = { profileId: task.channel_id, workerId: task.task_id, step: "run_audio" };
  this.activeAudio.add(task.task_id);
  try {
    await this.update(task.task_id, {
      status: "RUNNING",
      started_at: nowIso(),
      queue_position: null,
      progress_message: "Preparing audio",
      progress_percent: 0,
    });
    if (!task.episode_id) throw new RepositoryError("Episode is required", "EPISODE_REQUIRED");
    if (task.task_type === "GENERATE_NARRATION") {
      const channel = await this.repository.getChannel(task.channel_id);
      if (channel.engine === "quiz") throw new RepositoryError("Quiz channels use Quiz V2 voice generation", "QUIZ_V2_REQUIRED");
      await this.runNarrationTask(task);
      return;
    }
    const sceneNumber = this.findSceneNumber(task.task_id);
    if (!sceneNumber) throw new RepositoryError("Audio scene is required", "SCENE_REQUIRED");
    const scenes = await this.repository.readScenes(task.channel_id, task.episode_id);
    const scene = scenes.find((item) => item.scene_number === sceneNumber);
    if (!scene) throw new RepositoryError("Audio target scene not found", "SCENE_NOT_FOUND");
    const channel = await this.repository.getChannel(task.channel_id);
    const defaultBuiltinPath = this.repository.resolveContextPath(BUILTIN_DEFAULT_VOICE_PROFILE.reference_path);
    const voice = channel.voice_reference_path
      ? this.repository.resolveContextPath(channel.voice_reference_path)
      : (await this.repository.exists(defaultBuiltinPath))
        ? defaultBuiltinPath
        : "default";
    await this.update(task.task_id, { progress_message: "Synthesizing dialogue", progress_percent: 25 });
    const provider = this.audioProviderFactory({ channelId: task.channel_id, episodeId: task.episode_id, sceneNumber }, this.audioConfig);
    const result = await provider.generateDialogue(scene.dialogue, voice);
    if (this.get(task.task_id).status === "CANCELLED") return;
    const audioFile = await this.repository.getSceneAudioFile(task.channel_id, task.episode_id, path.basename(result.asset_path));
    const audioBuffer = await readFile(audioFile.absolutePath);
    await this.repository.saveSceneAudio(task.channel_id, task.episode_id, sceneNumber, result.asset_path, parseWavDuration(audioBuffer));
    await this.update(task.task_id, { progress_message: "Saving dialogue", progress_percent: 90 });
    await this.finish(task.task_id, "COMPLETED", null, [result.asset_path]);
  } catch (error) {
    const message =
      error instanceof Error && "code" in error && (error as { code?: string }).code === "AUDIO_SERVICE_UNAVAILABLE"
        ? "Audio service unavailable"
        : error instanceof Error
          ? error.message
          : "Audio generation failed";
    await this.finish(task.task_id, "FAILED", message);
    this.logger.error(message, { ...context, step: "run_audio" });
  } finally {
    this.activeAudio.delete(task.task_id);
  }
}

export async function runNarrationTask(this: TaskManagerRuntime, task: Task): Promise<void> {
  if (!task.episode_id) throw new RepositoryError("Episode is required", "EPISODE_REQUIRED");
  const episodeId = task.episode_id;
  const channelId = task.channel_id;
  const script = await this.repository.getEpisodeFile(channelId, episodeId, "script.md");
  const sections = extractNarrationChunks(script.content, 60, true).filter((section) => countWords(section.text) >= 3);
  if (sections.length === 0) throw new RepositoryError("A completed script is required before narration", "SCRIPT_REQUIRED");
  const channel = await this.repository.getChannel(channelId);
  const episode = await this.repository.getEpisode(channelId, episodeId);
  const defaultBuiltinPath = this.repository.resolveContextPath(BUILTIN_DEFAULT_VOICE_PROFILE.reference_path);
  const voice = channel.voice_reference_path
    ? this.repository.resolveContextPath(channel.voice_reference_path)
    : (await this.repository.exists(defaultBuiltinPath))
      ? defaultBuiltinPath
      : "default";
  const checkpointPath = this.repository.resolvePath("runtime", "narration-checkpoints", episodeId, "segments.json");
  const checkpoint = await readNarrationCheckpoint(checkpointPath);
  const nextCheckpoint: NarrationCheckpoint = { schema_version: 1, script_modified_at: script.modified_at, segments: {} };
  const segmentPaths: string[] = [];
  const concurrency = Math.max(1, Math.min(6, this.audioConfig.max_concurrent_tasks || 3));
  let completed = 0;
  const segmentResults = await runConcurrent(sections, concurrency, async (section, index) => {
    const segmentNumber = index + 1;
    const fingerprint = narrationSegmentFingerprint(
      section.text,
      voice,
      script.modified_at,
      this.audioConfig,
      this.videoConfig.narration_words_per_second,
    );
    let audio: Uint8Array | null = null;
    let assetPath: string | null = null;
    let isReused = false;
    const saved = checkpoint?.script_modified_at === script.modified_at ? checkpoint.segments[String(segmentNumber)] : undefined;
    if (saved?.fingerprint === fingerprint) {
      try {
        const existing = await this.repository.getEpisodeAudioFile(channelId, episodeId, path.basename(saved.asset_path));
        const existingAudio = new Uint8Array(await readFile(existing.absolutePath));
        const existingDuration = parseWavDuration(existingAudio);
        validateNarrationSegmentDuration(existingDuration, section.text, this.videoConfig.narration_words_per_second, segmentNumber);
        audio = existingAudio;
        assetPath = existing.path;
        isReused = true;
      } catch {
        // A checkpoint is advisory; missing, stale, or corrupt audio is regenerated below.
      }
    }
    if (!audio || !assetPath) {
      audio = await synthesizeWav(this.audioConfig, section.text, voice);
      const audioDuration = parseWavDuration(audio);
      validateNarrationSegmentDuration(audioDuration, section.text, this.videoConfig.narration_words_per_second, segmentNumber);
      assetPath = await this.repository.writeNarrationAudio(channelId, episodeId, audio, segmentNumber);
    }
    completed++;
    await this.update(task.task_id, {
      progress_message: `Narration · ${isReused ? "reusing" : "generating"} ${section.title} (${completed}/${sections.length})`,
      progress_percent: Math.round((completed / sections.length) * 78),
    });
    const audioDuration = parseWavDuration(audio);
    const audioFile = await this.repository.getEpisodeAudioFile(channelId, episodeId, path.basename(assetPath));
    return {
      segmentNumber,
      fingerprint,
      assetPath,
      durationSeconds: audioDuration,
      absolutePath: audioFile.absolutePath,
    };
  });

  for (const result of segmentResults) {
    nextCheckpoint.segments[String(result.segmentNumber)] = {
      fingerprint: result.fingerprint,
      asset_path: result.assetPath,
      duration_seconds: result.durationSeconds,
    };
    segmentPaths.push(result.absolutePath);
  }
  await writeNarrationCheckpoint(checkpointPath, nextCheckpoint);
  await this.update(task.task_id, { progress_message: "Assembling narration", progress_percent: 82 });
  const merged =
    sections.length === 1 && !this.audioConfig.match_target_duration
      ? await readFile(segmentPaths[0])
      : await this.mergeNarrationSegments(
          segmentPaths,
          this.audioConfig.match_target_duration ? episode.target_duration_minutes * 60 : undefined,
        );
  const assetPath = await this.repository.writeNarrationAudio(channelId, episodeId, merged);
  const duration = parseWavDuration(merged);
  const narrationWordCount = countWords(extractNarration(script.content));
  await this.repository.saveNarrationMetadata(channelId, episodeId, assetPath, duration, sections.length, narrationWordCount);
  await this.update(task.task_id, { progress_message: "Narration ready", progress_percent: 100 });
  await this.finish(task.task_id, "COMPLETED", null, [assetPath]);
}

export async function mergeNarrationSegments(
  this: TaskManagerRuntime,
  paths: string[],
  targetDurationSeconds?: number,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(`${this.audioConfig.service_url.replace(/\/$/, "")}/merge`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        paths,
        gap_ms: this.audioConfig.merge_gap_ms,
        ...(targetDurationSeconds ? { target_duration_seconds: targetDurationSeconds } : {}),
      }),
      signal: AbortSignal.timeout(15 * 60 * 1000),
    });
  } catch {
    throw new RepositoryError("Audio service unavailable", "AUDIO_SERVICE_UNAVAILABLE");
  }
  if (!response.ok) throw new RepositoryError("Narration assembly failed", "AUDIO_MERGE_FAILED");
  return new Uint8Array(await response.arrayBuffer());
}
