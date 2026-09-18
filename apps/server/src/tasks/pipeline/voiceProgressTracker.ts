import type { Task, ThumbnailLayoutType } from "@studio/shared";
import type { StudioLogger } from "../../logger.js";
import type { TaskManagerRuntime } from "../runtime.js";
import type { QuizVoicePacingClamp } from "../../quiz/audio/voiceSynthesis.js";

export interface ProgressState {
  completed: number;
  total: number;
  reused: boolean;
}

export interface QuizPipelineInputOptions {
  customHookText?: string;
  layoutOverride?: ThumbnailLayoutType;
  badgeOverride?: string;
}

export function handleVoicePacingClamp(logger: StudioLogger, channelId: string, taskId: string, details: QuizVoicePacingClamp): void {
  logger.warn(`Quiz voice pacing clamp hit ${JSON.stringify(details)}`, {
    profileId: channelId,
    workerId: taskId,
    step: "voice_pacing_clamp",
  });
}

export function createQuizPipelineInput(
  runtime: TaskManagerRuntime,
  task: Task,
  isParallelMode: () => boolean,
  options?: QuizPipelineInputOptions,
) {
  let assetState: ProgressState = { completed: 0, total: 0, reused: false };
  let voiceState: ProgressState = { completed: 0, total: 0, reused: false };

  const updateParallelProgress = async () => {
    if (isParallelMode()) {
      const assetRatio = assetState.total > 0 ? assetState.completed / assetState.total : 1;
      const voiceRatio = voiceState.total > 0 ? voiceState.completed / voiceState.total : 1;
      const progress_percent = 30 + Math.round(assetRatio * 14 + voiceRatio * 11);
      const assetLabel = `assets ${assetState.completed}/${Math.max(1, assetState.total)}`;
      const voiceLabel = `voice ${voiceState.completed}/${Math.max(1, voiceState.total)}`;
      await runtime.update(task.task_id, {
        progress_message: `Quiz · ${assetLabel} | ${voiceLabel}`,
        progress_percent,
      });
    }
  };

  return {
    repository: runtime.repository,
    config: {
      audio_generation: runtime.audioConfig,
      image_generation: runtime.imageConfig,
      image_fallback: runtime.imageFallbackConfig,
    },
    channelId: task.channel_id,
    episodeId: task.episode_id!,
    activeEngine: runtime.activeEngine,
    antigravityClient: runtime.antigravity,
    customHookText: options?.customHookText,
    layoutOverride: options?.layoutOverride,
    badgeOverride: options?.badgeOverride,
    onAssetProgress: async ({ completed, total, reused }: { completed: number; total: number; reused: boolean }) => {
      assetState = { completed, total, reused };
      if (isParallelMode()) {
        await updateParallelProgress();
      } else {
        await runtime.update(task.task_id, {
          progress_message: `Quiz · resolving assets ${completed}/${total}${reused ? " · reused" : ""}`,
          progress_percent: 30 + Math.round((completed / Math.max(1, total)) * 14),
        });
      }
    },
    onVoiceProgress: async ({ completed, total, reused }: { completed: number; total: number; reused: boolean }) => {
      voiceState = { completed, total, reused };
      if (isParallelMode()) {
        await updateParallelProgress();
      } else {
        await runtime.update(task.task_id, {
          progress_message: `Quiz · ${reused ? "reusing" : "generating"} voice ${completed}/${total}`,
          progress_percent: 44 + Math.round((completed / Math.max(1, total)) * 11),
        });
      }
    },
    onVoicePacingClamp: (details: QuizVoicePacingClamp) => {
      handleVoicePacingClamp(runtime.logger, task.channel_id, task.task_id, details);
    },
  };
}
