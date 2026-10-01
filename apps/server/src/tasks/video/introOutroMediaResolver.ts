import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import type { Channel, Episode, IntroOutroTransitionType } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { selectIntroOutroPair, type IntroOutroSelectionSource } from "./introOutroSelectionService.js";
import { pairFingerprint } from "../../quiz/introOutro/pairMedia.js";
import { RepositoryError } from "../../repository/errors.js";
import { prepareBookendMedia } from "./bookendMediaPreparation.js";

export interface IntroOutroMediaResolution {
  introHasAudio?: boolean;
  outroHasAudio?: boolean;
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
  // Settle both copies before returning or failing so a retry cannot race an unfinished copy.
  const prepared = await Promise.allSettled([
    prepareBookendMedia("intro", selection.introSourcePath, renderRoot),
    prepareBookendMedia("outro", selection.outroSourcePath, renderRoot),
  ]);
  const [intro, outro] = prepared;
  if (intro.status === "rejected") throw intro.reason;
  if (outro.status === "rejected") throw outro.reason;
  const copiedFingerprint = await pairFingerprint({
    style,
    introSourcePath: intro.value.absolutePath,
    outroSourcePath: outro.value.absolutePath,
  });
  if (copiedFingerprint !== selection.snapshot.fingerprint) {
    throw new RepositoryError(
      "Intro/Outro media changed during preparation. Restore the selected media and retry.",
      "INTRO_OUTRO_PAIR_CHANGED",
    );
  }
  const selectionFingerprint = await createSelectionFingerprint(style.style_id, selection.introSourcePath, selection.outroSourcePath, {
    introSha256: style.intro.sha256,
    outroSha256: style.outro.sha256,
    transitionType: style.transition_type,
    transitionDurationSeconds: style.transition_duration_seconds,
    audioMode: style.audio_mode,
  });

  return {
    introVideoPath: intro.value.videoPath,
    outroVideoPath: outro.value.videoPath,
    introHasAudio: selection.snapshot.intro_has_audio,
    outroHasAudio: selection.snapshot.outro_has_audio,
    transitionType: style.transition_type,
    transitionDurationSeconds: style.transition_duration_seconds,
    audioMode: "use_video_audio",
    styleId: style.style_id,
    stylePresetId: selection.stylePresetId,
    selectionSource: selection.source,
    selectionFingerprint,
  };
}
