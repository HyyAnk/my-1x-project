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
  /** Only the product id is read; Quiz Shorts pass their own id here. */
  episode: Pick<Episode, "episode_id">;
  bgmHistory: BgmHistoryEntry[];
  assetSources: Record<string, string>;
  onProgressMessage?: (message: string) => Promise<void>;
  introOutro?: {
    introVideoPath?: string;
    outroVideoPath?: string;
    audioMode?: "use_video_audio" | "overlay_bgm";
  };
};

export async function prepareSoundtrack({
  renderRoot,
  narration,
  timeline,
  episode,
  bgmHistory,
  assetSources,
  onProgressMessage,
  introOutro,
}: PrepareSoundtrackInput): Promise<{ selectedBgmTrackId: string | null; selectedBgmFilename: string | null }> {
  let selectedBgmTrackId: string | null = null;
  let selectedBgmFilename: string | null = null;

  const firstPlayStart = timeline.events.find(
    (event) => event.type === "bridge.topic.enter" || event.type === "bridge.cta.enter" || event.type === "question.enter",
  )?.at_seconds;
  const outroStart = timeline.events.find(
    (event) => event.segment_id === "outro" || (event.type === "narration.segment" && event.segment_id === "outro"),
  )?.at_seconds;

  const bgmStartSeconds =
    introOutro?.introVideoPath && typeof firstPlayStart === "number" ? Math.max(0, firstPlayStart) : (firstPlayStart ?? 0);

  const bgmOutroStartSeconds = introOutro?.outroVideoPath && typeof outroStart === "number" ? outroStart : outroStart;

  const renderSoundtrackPath = path.join(renderRoot, "soundtrack.wav");
  const soundtrackCheckpointPath = path.join(renderRoot, "soundtrack-checkpoint.json");
  const currentSoundtrackFp = soundtrackFingerprint(
    narration.modified_at,
    narration.size,
    timeline.events,
    undefined,
    bgmHistory.map((entry) => entry.track_id),
    {
      startSeconds: bgmStartSeconds,
      outroStartSeconds: bgmOutroStartSeconds,
    },
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
      durationSeconds: timeline.duration_seconds,
      activeWindow: { start: bgmStartSeconds, end: outroStart ?? timeline.duration_seconds },
      workingDirectory: path.join(renderRoot, "audio-mix-temp"),
      outputPath: renderSoundtrackPath,
      bgmOptions: {
        recentTrackIds: bgmHistory.map((entry) => entry.track_id),
        seed: episode.episode_id,
        startSeconds: bgmStartSeconds,
        outroStartSeconds: bgmOutroStartSeconds,
      },
      outroStartSeconds: bgmOutroStartSeconds,
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
