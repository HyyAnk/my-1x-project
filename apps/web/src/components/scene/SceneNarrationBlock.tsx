import { Check, Copy, SpeakerHigh } from "@phosphor-icons/react";
import type { RefObject } from "react";
import type { Scene, Task } from "@studio/shared";
import { SceneAudioPlayer } from "./SceneAudioPlayer";

export interface SceneNarrationBlockProps {
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
  copied: string | null;
  dialogueRef: RefObject<HTMLTextAreaElement | null>;
  onCopy: (key: string, value: string) => Promise<void>;
  onGenerateAudio: () => void;
  onMatchDuration: () => void;
  onChange: (scene: Scene) => void;
  autoGrow: (element: HTMLTextAreaElement) => void;
}

export function SceneNarrationBlock({
  scene,
  audioTask,
  audioSrc,
  processing,
  mergePending,
  audioFailed,
  audioMismatch,
  audioDelta,
  audioDirection,
  now,
  copied,
  dialogueRef,
  onCopy,
  onGenerateAudio,
  onMatchDuration,
  onChange,
  autoGrow,
}: SceneNarrationBlockProps) {
  const clearAudioWhenDialogueChanges = (dialogue: string): Scene =>
    dialogue === scene.dialogue
      ? { ...scene, dialogue }
      : { ...scene, dialogue, audio_asset_path: null, audio_generated_at: null, audio_duration_seconds: null };

  return (
    <div className="scene-block">
      <div className="block-heading">
        <span>Narration timeline excerpt</span>
        <div className="scene-block-actions">
          <button className="copy-button" onClick={() => void onCopy(`${scene.scene_id}-dialogue`, scene.dialogue)}>
            {copied === `${scene.scene_id}-dialogue` ? <Check size={14} /> : <Copy size={14} />}
            {copied === `${scene.scene_id}-dialogue` ? "Copied" : "Copy"}
          </button>
          {!audioSrc ? (
            <button
              className="copy-button"
              type="button"
              disabled={processing || mergePending}
              onClick={onGenerateAudio}
              title={audioFailed ? "Retry preview audio" : "Generate preview audio"}
            >
              <SpeakerHigh size={14} />
              {audioFailed ? "Retry preview" : "Preview audio"}
            </button>
          ) : null}
        </div>
      </div>
      <SceneAudioPlayer
        scene={scene}
        audioTask={audioTask}
        audioSrc={audioSrc}
        processing={processing}
        mergePending={mergePending}
        audioFailed={audioFailed}
        audioMismatch={audioMismatch}
        audioDelta={audioDelta}
        audioDirection={audioDirection}
        now={now}
        onGenerateAudio={onGenerateAudio}
        onMatchDuration={onMatchDuration}
      />
      <textarea
        ref={dialogueRef}
        rows={1}
        value={scene.dialogue}
        disabled={processing || mergePending}
        onInput={(event) => autoGrow(event.currentTarget)}
        onChange={(event) => onChange(clearAudioWhenDialogueChanges(event.target.value))}
      />
    </div>
  );
}
