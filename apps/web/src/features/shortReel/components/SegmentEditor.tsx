import { useState } from "react";
import { FloppyDisk, Warning, Clock, FilmReel, Sparkle } from "@phosphor-icons/react";
import type { ReelSegment, SegmentIndex } from "@studio/shared";

export interface SegmentEditorProps {
  segments: ReelSegment[];
  staleSegments?: SegmentIndex[];
  isSaving: boolean;
  onSaveSegment: (index: SegmentIndex, updated: ReelSegment) => Promise<void>;
  onChangeSegmentDraft: (updatedSegments: ReelSegment[]) => void;
  onGenerateScript?: () => void;
  isGenerating?: boolean;
}

export function SegmentEditor({
  segments,
  staleSegments = [],
  isSaving,
  onSaveSegment,
  onChangeSegmentDraft,
  onGenerateScript,
  isGenerating = false,
}: SegmentEditorProps) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<SegmentIndex>(1);

  const activeSegment = segments.find((s) => s.index === activeSegmentIndex) || segments[0];

  if (!activeSegment) {
    return (
      <div className="short-reel-empty-card" role="region" aria-label="Segment Editor">
        <FilmReel size={32} weight="duotone" />
        <p>No script segments available. Generate a script or package first.</p>
        {onGenerateScript && (
          <button
            type="button"
            className="short-reel-primary-btn"
            onClick={onGenerateScript}
            disabled={isGenerating}
            aria-label="Generate Script"
            style={{ marginTop: "12px" }}
          >
            <Sparkle size={16} weight="fill" />
            <span>Generate Script</span>
          </button>
        )}
      </div>
    );
  }

  const isCurrentSegmentStale = staleSegments.includes(activeSegment.index);

  const handleUpdateField = <K extends keyof ReelSegment>(field: K, value: ReelSegment[K]) => {
    const updatedSegments = segments.map((seg) => {
      if (seg.index === activeSegment.index) {
        return { ...seg, [field]: value };
      }
      return seg;
    });
    onChangeSegmentDraft(updatedSegments);
  };

  const handleDurationChange = (raw: string) => {
    if (raw === "") return;
    const val = parseFloat(raw);
    if (Number.isNaN(val) || val <= 0) return;

    // Clamp duration to 8..10 range
    const clampedDuration = Math.min(10, Math.max(8, val));
    const updatedSegments = segments.map((seg) => {
      if (seg.index === activeSegment.index) {
        // When duration is reduced: automatically clamp any cue whose end_seconds > newDuration
        const clampedCues = seg.text_cues.map((cue) => {
          const end_seconds = Math.min(cue.end_seconds, clampedDuration);
          const start_seconds = Math.min(cue.start_seconds, end_seconds);
          return {
            ...cue,
            start_seconds: Number(start_seconds.toFixed(2)),
            end_seconds: Number(end_seconds.toFixed(2)),
          };
        });
        return {
          ...seg,
          duration_seconds: clampedDuration,
          text_cues: clampedCues,
        };
      }
      return seg;
    });
    onChangeSegmentDraft(updatedSegments);
  };

  const handleUpdateCue = (cueIndex: number, text: string) => {
    const updatedCues = [...activeSegment.text_cues];
    if (updatedCues[cueIndex]) {
      updatedCues[cueIndex] = { ...updatedCues[cueIndex], text };
      handleUpdateField("text_cues", updatedCues);
    }
  };

  const handleUpdateCueTiming = (cueIndex: number, field: "start_seconds" | "end_seconds", rawVal: string) => {
    if (rawVal === "") return;
    const val = parseFloat(rawVal);
    if (Number.isNaN(val) || val < 0) return;

    const updatedCues = [...activeSegment.text_cues];
    const targetCue = updatedCues[cueIndex];
    if (!targetCue) return;

    if (field === "start_seconds") {
      const clampedStart = Math.min(val, targetCue.end_seconds);
      updatedCues[cueIndex] = {
        ...targetCue,
        start_seconds: Number(clampedStart.toFixed(2)),
      };
    } else {
      const clampedEnd = Math.max(targetCue.start_seconds, Math.min(val, activeSegment.duration_seconds));
      updatedCues[cueIndex] = {
        ...targetCue,
        end_seconds: Number(clampedEnd.toFixed(2)),
      };
    }
    handleUpdateField("text_cues", updatedCues);
  };

  const handleSave = async () => {
    await onSaveSegment(activeSegment.index, activeSegment);
  };

  return (
    <section className="short-reel-card short-reel-segment-editor" aria-label="Segment Editor">
      <div className="short-reel-card-header">
        <div className="short-reel-card-title-group">
          <h3 className="short-reel-card-title">Script Segments</h3>
          <span className="short-reel-badge short-reel-badge-total">
            Total Duration: {segments.reduce((acc, s) => acc + s.duration_seconds, 0)}s
          </span>
        </div>
      </div>

      {/* Segment Navigation Tabs (1 / 2 / 3) */}
      <div className="short-reel-segment-tabs" role="tablist" aria-label="Script Segment Tabs">
        {([1, 2, 3] as const).map((idx) => {
          const seg = segments.find((s) => s.index === idx);
          const isSelected = activeSegmentIndex === idx;
          const isStale = staleSegments.includes(idx);

          return (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`short-reel-segment-tab ${isSelected ? "active" : ""} ${isStale ? "stale" : ""}`}
              onClick={() => setActiveSegmentIndex(idx)}
            >
              <div className="short-reel-segment-tab-content">
                <span className="short-reel-segment-tab-title">Segment {idx}</span>
                <span className="short-reel-segment-tab-sub">{seg ? `${seg.duration_seconds}s • ${seg.mode}` : "Empty"}</span>
              </div>
              {isStale && (
                <span className="short-reel-stale-badge" title="Downstream segment is marked stale from earlier edits">
                  <Warning size={14} weight="bold" />
                  <span>Stale</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stale Warning Banner if applicable */}
      {isCurrentSegmentStale && (
        <div className="short-reel-alert short-reel-alert-warning" role="alert">
          <Warning size={18} weight="fill" />
          <div className="short-reel-alert-body">
            <strong>Downstream Segment Stale</strong>
            <p>Edits to preceding segments require reviewing or resaving this segment to re-align continuity.</p>
          </div>
        </div>
      )}

      {/* Segment Content Form */}
      <div className="short-reel-segment-body">
        {/* Timing & Mode Row */}
        <div className="short-reel-form-row">
          <div className="short-reel-form-col">
            <label className="short-reel-label" htmlFor={`seg-duration-${activeSegment.index}`}>
              <Clock size={16} />
              <span>Duration (seconds, 8–10)</span>
            </label>
            <input
              id={`seg-duration-${activeSegment.index}`}
              type="number"
              min={8}
              max={10}
              step={0.5}
              className="short-reel-input"
              value={activeSegment.duration_seconds}
              onChange={(e) => handleDurationChange(e.target.value)}
              onBlur={(e) => {
                const raw = e.target.value;
                if (raw === "" || Number.isNaN(parseFloat(raw))) {
                  handleDurationChange("8");
                } else {
                  const val = parseFloat(raw);
                  if (val < 8 || val > 10) {
                    handleDurationChange(String(Math.min(10, Math.max(8, val))));
                  }
                }
              }}
            />
            {(activeSegment.duration_seconds < 8 || activeSegment.duration_seconds > 10) && (
              <span
                className="short-reel-field-error"
                style={{ fontSize: "11px", color: "var(--warning, #f59e0b)", marginTop: "4px", display: "block" }}
              >
                Duration must be between 8 and 10 seconds.
              </span>
            )}
          </div>
          <div className="short-reel-form-col">
            <label className="short-reel-label" htmlFor={`seg-mode-${activeSegment.index}`}>
              <span>Mode</span>
            </label>
            <input
              id={`seg-mode-${activeSegment.index}`}
              type="text"
              readOnly
              className="short-reel-input short-reel-input-readonly"
              value={activeSegment.mode}
            />
          </div>
        </div>

        {/* Narrative */}
        <div className="short-reel-form-group">
          <label className="short-reel-label" htmlFor={`seg-narrative-${activeSegment.index}`}>
            <span>Visual Narrative</span>
          </label>
          <textarea
            id={`seg-narrative-${activeSegment.index}`}
            rows={3}
            className="short-reel-textarea"
            value={activeSegment.narrative}
            onChange={(e) => handleUpdateField("narrative", e.target.value)}
          />
        </div>

        {/* Text Cues */}
        <div className="short-reel-form-group">
          <label className="short-reel-label">
            <span>On-Screen Text Cues</span>
          </label>
          <div className="short-reel-cues-list">
            {activeSegment.text_cues.map((cue, cIdx) => (
              <div key={cIdx} className="short-reel-cue-item">
                <div className="short-reel-cue-header">
                  <span className={`short-reel-cue-role short-reel-cue-role-${cue.role}`}>{cue.role}</span>
                  <div className="short-reel-cue-timing" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <input
                      id={`cue-${activeSegment.index}-${cIdx}-start`}
                      type="number"
                      min={0}
                      max={cue.end_seconds}
                      step={0.5}
                      className="short-reel-input short-reel-cue-time-input"
                      style={{ width: "52px", padding: "2px 4px", fontSize: "11px", height: "22px" }}
                      value={cue.start_seconds}
                      onChange={(e) => handleUpdateCueTiming(cIdx, "start_seconds", e.target.value)}
                      aria-label={`Cue ${cIdx + 1} start seconds`}
                    />
                    <span>s –</span>
                    <input
                      id={`cue-${activeSegment.index}-${cIdx}-end`}
                      type="number"
                      min={cue.start_seconds}
                      max={activeSegment.duration_seconds}
                      step={0.5}
                      className="short-reel-input short-reel-cue-time-input"
                      style={{ width: "52px", padding: "2px 4px", fontSize: "11px", height: "22px" }}
                      value={cue.end_seconds}
                      onChange={(e) => handleUpdateCueTiming(cIdx, "end_seconds", e.target.value)}
                      aria-label={`Cue ${cIdx + 1} end seconds`}
                    />
                    <span>s</span>
                  </div>
                </div>
                <input
                  type="text"
                  className="short-reel-input short-reel-cue-input"
                  value={cue.text}
                  onChange={(e) => handleUpdateCue(cIdx, e.target.value)}
                  aria-label={`Cue ${cIdx + 1} text`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Audio Direction */}
        <div className="short-reel-form-group">
          <label className="short-reel-label" htmlFor={`seg-audio-${activeSegment.index}`}>
            <span>Audio & Voice Direction</span>
          </label>
          <input
            id={`seg-audio-${activeSegment.index}`}
            type="text"
            className="short-reel-input"
            value={activeSegment.audio_direction}
            onChange={(e) => handleUpdateField("audio_direction", e.target.value)}
          />
        </div>

        {/* Continuity End State Summary */}
        <div className="short-reel-form-group">
          <label className="short-reel-label">
            <span>Continuity End State</span>
          </label>
          <div className="short-reel-continuity-box">
            <div>
              <strong>Position:</strong> {activeSegment.end_state.position}
            </div>
            <div>
              <strong>Action:</strong> {activeSegment.end_state.action}
            </div>
            <div>
              <strong>Camera:</strong> {activeSegment.end_state.camera}
            </div>
            <div>
              <strong>Environment:</strong> {activeSegment.end_state.environment}
            </div>
          </div>
        </div>

        {/* Save Segment Action */}
        <div className="short-reel-form-actions">
          <button
            type="button"
            className="short-reel-primary-btn"
            disabled={isSaving}
            onClick={handleSave}
            aria-label={`Save Segment ${activeSegment.index}`}
          >
            {isSaving ? (
              <>
                <span className="short-reel-spinner" aria-hidden="true" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FloppyDisk size={16} weight="bold" />
                <span>Save Segment {activeSegment.index}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
