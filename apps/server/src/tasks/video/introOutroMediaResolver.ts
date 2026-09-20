import { createHash } from "node:crypto";
import { copyFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Channel, Episode, IntroOutroTransitionType } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { selectIntroOutroPair, type IntroOutroSelectionSource } from "./introOutroSelectionService.js";

export interface IntroOutroMediaResolution {
  introVideoPath?: string;
  outroVideoPath?: string;
  transitionType?: IntroOutroTransitionType;
  transitionDurationSeconds?: number;
  audioMode?: "use_video_audio" | "overlay_bgm";
  styleId?: string;
  stylePresetId?: string;
  selectionSource: IntroOutroSelectionSource;
  selectionFingerprint?: string;
  unavailableReason?: string;
}

async function createSelectionFingerprint(
  styleId: string,
  introPath: string,
  outroPath: string,
  metadata: Record<string, unknown>,
): Promise<string> {
  const [introStat, outroStat] = await Promise.all([stat(introPath), stat(outroPath)]);
  return createHash("sha256")
    .update(
      JSON.stringify({
        styleId,
        intro: { size: introStat.size, modifiedAt: introStat.mtimeMs },
        outro: { size: outroStat.size, modifiedAt: outroStat.mtimeMs },
        metadata,
      }),
    )
    .digest("hex");
}

export async function resolveAndCopyIntroOutro(
  repository: RepositoryService,
  channel: Channel,
  episode: Episode,
  renderRoot: string,
  taskId = `${episode.episode_id}:legacy`,
): Promise<IntroOutroMediaResolution> {
  const selection = await selectIntroOutroPair(repository, channel, episode, taskId);
  if (!selection.style || !selection.introSourcePath || !selection.outroSourcePath) {
    return {
      selectionSource: selection.source,
      stylePresetId: selection.stylePresetId,
      unavailableReason: selection.unavailableReason,
    };
  }

  const { style } = selection;
  const targetIntroPath = path.join(renderRoot, "intro.mp4");
  const targetOutroPath = path.join(renderRoot, "outro.mp4");
  await Promise.all([copyFile(selection.introSourcePath, targetIntroPath), copyFile(selection.outroSourcePath, targetOutroPath)]);
  const selectionFingerprint = await createSelectionFingerprint(style.style_id, selection.introSourcePath, selection.outroSourcePath, {
    introSha256: style.intro.sha256,
    outroSha256: style.outro.sha256,
    transitionType: style.transition_type,
    transitionDurationSeconds: style.transition_duration_seconds,
    audioMode: style.audio_mode,
  });

  return {
    introVideoPath: "./intro.mp4",
    outroVideoPath: "./outro.mp4",
    transitionType: style.transition_type,
    transitionDurationSeconds: style.transition_duration_seconds,
    audioMode: style.audio_mode ?? "use_video_audio",
    styleId: style.style_id,
    stylePresetId: selection.stylePresetId,
    selectionSource: selection.source,
    selectionFingerprint,
  };
}
