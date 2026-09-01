import { readFile } from "node:fs/promises";
import path from "node:path";
import { BUILTIN_DEFAULT_VOICE_PROFILE, nowIso, type Task } from "@studio/shared";
import { RepositoryError } from "../repository.js";
import { parseWavDuration } from "./parsers.js";
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
