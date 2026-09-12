import { FilmReel, Sparkle } from "@phosphor-icons/react";
import type { ReelSegment, SegmentIndex } from "@studio/shared";
import { SegmentTimingControls } from "./segment/SegmentTimingControls";
import { SegmentCueList } from "./segment/SegmentCueList";
import { SegmentContinuityCard } from "./segment/SegmentContinuityCard";
import { SegmentNavigationTabs } from "./segment/SegmentNavigationTabs";
import { SegmentNarrativeFields } from "./segment/SegmentNarrativeFields";
import { SegmentSaveButton } from "./segment/SegmentSaveButton";
import { useSegmentDraft } from "./segment/useSegmentDraft";

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
  const {
    activeSegmentIndex,
    setActiveSegmentIndex,
    activeSegment,
    updateField,
    updateDuration,
    updateCueText,
    updateCueTiming,
  } = useSegmentDraft(segments, onChangeSegmentDraft);

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

      <SegmentNavigationTabs
        segments={segments}
        activeSegmentIndex={activeSegmentIndex}
        staleSegments={staleSegments}
        onSelectSegment={setActiveSegmentIndex}
        isCurrentSegmentStale={isCurrentSegmentStale}
      />

      <div className="short-reel-segment-body">
        <SegmentTimingControls
          segmentIndex={activeSegment.index}
          durationSeconds={activeSegment.duration_seconds}
          mode={activeSegment.mode}
          onDurationChange={updateDuration}
        />

        <SegmentNarrativeFields
          segmentIndex={activeSegment.index}
          narrative={activeSegment.narrative}
          audioDirection={activeSegment.audio_direction}
          onUpdateNarrative={(val) => updateField("narrative", val)}
          onUpdateAudio={(val) => updateField("audio_direction", val)}
        />

        <SegmentCueList
          segmentIndex={activeSegment.index}
          durationSeconds={activeSegment.duration_seconds}
          cues={activeSegment.text_cues}
          onUpdateCueText={updateCueText}
          onUpdateCueTiming={updateCueTiming}
        />

        <SegmentContinuityCard endState={activeSegment.end_state} />

        <SegmentSaveButton
          segmentIndex={activeSegment.index}
          isSaving={isSaving}
          onSave={() => onSaveSegment(activeSegment.index, activeSegment)}
        />
      </div>
    </section>
  );
}
