import path from "node:path";
import { nowIso, type BgmHistoryEntry, type Episode, type QuizTimeline } from "@studio/shared";
import { hasNonEmptyFile } from "../artifactFiles.js";
import { readSoundtrackCheckpoint, writeSoundtrackCheckpoint } from "../checkpoints.js";
import { soundtrackFingerprint } from "../fingerprints.js";
import { mixMasterSoundtrack } from "../../quiz/audio/soundtrackMixer.js";

export type PrepareSoundtrackInput = {
  renderRoot: string;
  narration: { absolutePath: string; modified_at: string; size: number };
  timeline: QuizTimeline;
  episode: Episode;
  bgmHistory: BgmHistoryEntry[];
  assetSources: Record<string, string>;
  onProgressMessage?: (message: string) => Promise<void>;
};

export async function prepareSoundtrack({
  renderRoot,
  narration,
  timeline,
  episode,
  bgmHistory,
  assetSources,
  onProgressMessage,
}: PrepareSoundtrackInput): Promise<{ selectedBgmTrackId: string | null; selectedBgmFilename: string | null }> {
  let selectedBgmTrackId: string | null = null;
  let selectedBgmFilename: string | null = null;

  const renderSoundtrackPath = path.join(renderRoot, "soundtrack.wav");
  const soundtrackCheckpointPath = path.join(renderRoot, "soundtrack-checkpoint.json");
  const currentSoundtrackFp = soundtrackFingerprint(
    narration.modified_at,
    narration.size,
    timeline.events,
    undefined,
    bgmHistory.map((entry) => entry.track_id),
  );
  const existingSoundtrackCheckpoint = await readSoundtrackCheckpoint(soundtrackCheckpointPath);
  const hasValidCachedSoundtrack =
    existingSoundtrackCheckpoint?.soundtrack_fingerprint === currentSoundtrackFp && (await hasNonEmptyFile(renderSoundtrackPath));

  if (hasValidCachedSoundtrack) {
    selectedBgmTrackId = existingSoundtrackCheckpoint.bgm_track_id;
    selectedBgmFilename = existingSoundtrackCheckpoint.bgm_filename;
    await onProgressMessage?.("Quiz · reusing cached master soundtrack");
  } else {
    await onProgressMessage?.("Quiz · pre-mixing master soundtrack");
    const mixResult = await mixMasterSoundtrack({
      narrationPath: narration.absolutePath,
      timeline,
      durationSeconds: episode.narration_duration_seconds ?? timeline.duration_seconds,
      workingDirectory: path.join(renderRoot, "audio-mix-temp"),
      outputPath: renderSoundtrackPath,
      bgmOptions: {
        recentTrackIds: bgmHistory.map((entry) => entry.track_id),
        seed: episode.episode_id,
      },
      assets: assetSources,
    });
    if (mixResult.plan.bgmItems.length > 0) {
      selectedBgmTrackId = mixResult.plan.bgmItems[0].trackId;
      selectedBgmFilename = mixResult.plan.bgmItems[0].filename;
    }
    await writeSoundtrackCheckpoint(soundtrackCheckpointPath, {
      schema_version: 1,
      soundtrack_fingerprint: currentSoundtrackFp,
      duration_seconds: mixResult.durationSeconds,
      bgm_track_id: selectedBgmTrackId,
      bgm_filename: selectedBgmFilename,
      created_at: nowIso(),
    });
  }

  return { selectedBgmTrackId, selectedBgmFilename };
}
