import { ArrowClockwise, ArrowRight, CircleNotch } from "@phosphor-icons/react";
import type { Scene, Task } from "@studio/shared";
import { SceneAudioMismatchWarning } from "./SceneAudioPlayer";

export interface SceneCardHeaderProps {
  scene: Scene;
  nextScene: Scene | null;
  maxDuration: number;
  processing: boolean;
  mergePending: boolean;
  submitting: boolean;
  regenerating: boolean;
  narrationReadout: string;
  shotCount: number;
  audioMismatch: boolean;
  audioDelta: number;
  audioDirection: "longer" | "shorter";
  overlayKind: string;
  onChange: (scene: Scene) => void;
  onRegenerate: (type: Task["task_type"]) => void;
  onMergeNext: () => void;
  onMatchDuration: () => void;
}

export function SceneCardHeader({
  scene,
  nextScene,
  maxDuration,
  processing,
  mergePending,
  submitting,
  regenerating,
  narrationReadout,
  shotCount,
  audioMismatch,
  audioDelta,
  audioDirection,
  overlayKind,
  onChange,
  onRegenerate,
  onMergeNext,
  onMatchDuration,
}: SceneCardHeaderProps) {
  const mergedDuration = nextScene ? scene.duration_seconds + nextScene.duration_seconds : null;
  const mergeTooLong = mergedDuration !== null && mergedDuration > maxDuration;
  const mergeTooltip = mergeTooLong
    ? `Combined duration exceeds the ${maxDuration}s generation limit`
    : "Override automatic shot grouping";

  return (
    <div className="scene-card-header">
      <div className="scene-number">Shot {String(scene.scene_number).padStart(2, "0")}</div>
      <span className="shot-sequence">{scene.sequence_title}</span>
      <span className="shot-type">{scene.asset_type.replaceAll("_", " ")}</span>
      {scene.continuity_bundle_id ? <span className="continuity-badge">{scene.continuity_bundle_id}</span> : null}
      {overlayKind !== "none" ? <span className="overlay-badge">overlay · {overlayKind.replaceAll("_", " ")}</span> : null}
      <label className="duration-input">
        Duration{" "}
        <input
          type="number"
          min="1"
          max={maxDuration}
          step="0.5"
          value={scene.duration_seconds}
          disabled={processing || mergePending}
          onChange={(event) => onChange({ ...scene, duration_seconds: Math.min(maxDuration, Number(event.target.value)) })}
        />{" "}
        sec
      </label>
      <span className="narration-estimate">~{narrationReadout}s narration</span>
      {shotCount > 1 ? (
        <span className="scene-cut-badge">
          {scene.duration_seconds}s · {shotCount} cuts
        </span>
      ) : null}
      <SceneAudioMismatchWarning
        audioMismatch={audioMismatch}
        audioDelta={audioDelta}
        audioDirection={audioDirection}
        onMatchDuration={onMatchDuration}
      />
      <div className="scene-tools">
        <button
          type="button"
          className="quiet-button compact"
          onClick={() => onRegenerate("REGENERATE_BOTH")}
          disabled={submitting || processing || mergePending}
        >
          {submitting || regenerating ? <CircleNotch className="spin" size={14} /> : <ArrowClockwise size={14} />}
          {regenerating ? "Regenerating…" : "Regenerate"}
        </button>
        {nextScene ? (
          <span className="control-tooltip" data-tooltip={mergeTooltip} title={mergeTooltip} tabIndex={mergeTooLong ? 0 : -1}>
            <button
              className="quiet-button compact merge-button"
              type="button"
              aria-label="Combine with next shot"
              disabled={mergeTooLong || mergePending || processing}
              onClick={onMergeNext}
            >
              {mergePending ? <CircleNotch className="spin" size={14} /> : <ArrowRight size={14} />}
              {mergePending ? "Combining…" : "Combine"}
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
