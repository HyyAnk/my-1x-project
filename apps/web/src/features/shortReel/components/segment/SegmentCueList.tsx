import type { ReelSegment } from "@studio/shared";
import { CueTimingInputs } from "./SegmentTimingControls";

export interface SegmentCueListProps {
  segmentIndex: number;
  durationSeconds: number;
  cues: ReelSegment["text_cues"];
  onUpdateCueText: (cueIndex: number, text: string) => void;
  onUpdateCueTiming: (cueIndex: number, field: "start_seconds" | "end_seconds", rawVal: string) => void;
}

export function SegmentCueList({
  segmentIndex,
  durationSeconds,
  cues,
  onUpdateCueText,
  onUpdateCueTiming,
}: SegmentCueListProps) {
  return (
    <div className="short-reel-form-group">
      <label className="short-reel-label">
        <span>On-Screen Text Cues</span>
      </label>
      <div className="short-reel-cues-list">
        {cues.map((cue, cIdx) => (
          <div key={cIdx} className="short-reel-cue-item">
            <div className="short-reel-cue-header">
              <span className={`short-reel-cue-role short-reel-cue-role-${cue.role}`}>{cue.role}</span>
              <CueTimingInputs
                segmentIndex={segmentIndex}
                cueIndex={cIdx}
                startSeconds={cue.start_seconds}
                endSeconds={cue.end_seconds}
                maxDuration={durationSeconds}
                onTimingChange={(field, rawVal) => onUpdateCueTiming(cIdx, field, rawVal)}
              />
            </div>
            <input
              type="text"
              className="short-reel-input short-reel-cue-input"
              value={cue.text}
              onChange={(e) => onUpdateCueText(cIdx, e.target.value)}
              aria-label={`Cue ${cIdx + 1} text`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
