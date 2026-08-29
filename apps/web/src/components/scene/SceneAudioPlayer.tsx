import { ArrowClockwise, SpeakerHigh, WarningCircle } from "@phosphor-icons/react";
import type { Scene, Task } from "@studio/shared";
import { InlineTaskState } from "../InlineTaskState";

export interface SceneAudioPlayerProps {
  scene: Scene;
  audioTask: Task | null;
  audioSrc: string | null;
  processing: boolean;
  mergePending: boolean;
  audioFailed: boolean;
  audioMismatch: boolean;
  audioDelta: number;
  audioDirection: "longer" | "shorter";
  now: number;
  onGenerateAudio: () => void;
  onMatchDuration: () => void;
}

export function SceneAudioMismatchWarning({
  audioMismatch,
  audioDelta,
  audioDirection,
  onMatchDuration,
}: {
  audioMismatch: boolean;
  audioDelta: number;
  audioDirection: "longer" | "shorter";
  onMatchDuration: () => void;
}) {
  if (!audioMismatch) return null;
  return (
    <div className="audio-duration-warning" role="status">
      <WarningCircle size={13} />
      Preview is {audioDelta.toFixed(1)}s {audioDirection}
      <button type="button" onClick={onMatchDuration}>
        Match
      </button>
    </div>
  );
}

export function SceneAudioPlayer({
  scene,
  audioTask,
  audioSrc,
  processing,
  mergePending,
  audioFailed,
  now,
  onGenerateAudio,
}: SceneAudioPlayerProps) {
  return (
    <>
      {audioTask ? <InlineTaskState task={audioTask} now={now} /> : null}
      {audioSrc ? (
        <div className="audio-player-row">
          <audio
            controls={!processing && !mergePending}
            preload="metadata"
            src={audioSrc}
            aria-label={`Shot ${scene.scene_number} preview audio`}
          />
          <button
            className="icon-button"
            type="button"
            title="Regenerate preview audio"
            aria-label="Regenerate preview audio"
            disabled={processing || mergePending}
            onClick={onGenerateAudio}
          >
            <ArrowClockwise size={15} />
          </button>
        </div>
      ) : null}
    </>
  );
}
