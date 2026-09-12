import { Clock } from "@phosphor-icons/react";

export function clampDuration(raw: string): number | null {
  if (raw === "") return null;
  const val = parseFloat(raw);
  if (Number.isNaN(val) || val <= 0) return null;
  return Math.min(10, Math.max(8, val));
}

export function clampCueTiming(
  field: "start_seconds" | "end_seconds",
  rawVal: string,
  cue: { start_seconds: number; end_seconds: number },
  maxDuration: number,
): { start_seconds: number; end_seconds: number } | null {
  if (rawVal === "") return null;
  const val = parseFloat(rawVal);
  if (Number.isNaN(val) || val < 0) return null;

  if (field === "start_seconds") {
    const clampedStart = Math.min(val, cue.end_seconds);
    return {
      ...cue,
      start_seconds: Number(clampedStart.toFixed(2)),
    };
  }

  const clampedEnd = Math.max(cue.start_seconds, Math.min(val, maxDuration));
  return {
    ...cue,
    end_seconds: Number(clampedEnd.toFixed(2)),
  };
}

export interface CueTimingInputsProps {
  segmentIndex: number;
  cueIndex: number;
  startSeconds: number;
  endSeconds: number;
  maxDuration: number;
  onTimingChange: (field: "start_seconds" | "end_seconds", rawVal: string) => void;
}

export function CueTimingInputs({
  segmentIndex,
  cueIndex,
  startSeconds,
  endSeconds,
  maxDuration,
  onTimingChange,
}: CueTimingInputsProps) {
  return (
    <div className="short-reel-cue-timing" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <input
        id={`cue-${segmentIndex}-${cueIndex}-start`}
        type="number"
        min={0}
        max={endSeconds}
        step={0.5}
        className="short-reel-input short-reel-cue-time-input"
        style={{ width: "52px", padding: "2px 4px", fontSize: "11px", height: "22px" }}
        value={startSeconds}
        onChange={(e) => onTimingChange("start_seconds", e.target.value)}
        aria-label={`Cue ${cueIndex + 1} start seconds`}
      />
      <span>s –</span>
      <input
        id={`cue-${segmentIndex}-${cueIndex}-end`}
        type="number"
        min={startSeconds}
        max={maxDuration}
        step={0.5}
        className="short-reel-input short-reel-cue-time-input"
        style={{ width: "52px", padding: "2px 4px", fontSize: "11px", height: "22px" }}
        value={endSeconds}
        onChange={(e) => onTimingChange("end_seconds", e.target.value)}
        aria-label={`Cue ${cueIndex + 1} end seconds`}
      />
      <span>s</span>
    </div>
  );
}

export interface SegmentTimingControlsProps {
  segmentIndex: number;
  durationSeconds: number;
  mode: string;
  onDurationChange: (raw: string) => void;
}

export function SegmentTimingControls({
  segmentIndex,
  durationSeconds,
  mode,
  onDurationChange,
}: SegmentTimingControlsProps) {
  const isInvalidDuration = durationSeconds < 8 || durationSeconds > 10;

  return (
    <div className="short-reel-form-row">
      <div className="short-reel-form-col">
        <label className="short-reel-label" htmlFor={`seg-duration-${segmentIndex}`}>
          <Clock size={16} />
          <span>Duration (seconds, 8–10)</span>
        </label>
        <input
          id={`seg-duration-${segmentIndex}`}
          type="number"
          min={8}
          max={10}
          step={0.5}
          className="short-reel-input"
          value={durationSeconds}
          onChange={(e) => onDurationChange(e.target.value)}
          onBlur={(e) => {
            const raw = e.target.value;
            if (raw === "" || Number.isNaN(parseFloat(raw))) {
              onDurationChange("8");
            } else {
              const val = parseFloat(raw);
              if (val < 8 || val > 10) {
                onDurationChange(String(Math.min(10, Math.max(8, val))));
              }
            }
          }}
        />
        {isInvalidDuration && (
          <span
            className="short-reel-field-error"
            style={{ fontSize: "11px", color: "var(--warning, #f59e0b)", marginTop: "4px", display: "block" }}
          >
            Duration must be between 8 and 10 seconds.
          </span>
        )}
      </div>
      <div className="short-reel-form-col">
        <label className="short-reel-label" htmlFor={`seg-mode-${segmentIndex}`}>
          <span>Mode</span>
        </label>
        <input
          id={`seg-mode-${segmentIndex}`}
          type="text"
          readOnly
          className="short-reel-input short-reel-input-readonly"
          value={mode}
        />
      </div>
    </div>
  );
}
