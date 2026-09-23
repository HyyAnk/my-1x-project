import { useState } from "react";
import { FilmReel, Sparkle, Copy, Check, MicrophoneStage } from "@phosphor-icons/react";
import type { ReelSegment, SegmentIndex, ShortReelTopicSnapshot, ShortReelSourceSnapshot } from "@studio/shared";
import { SegmentTimingControls } from "./segment/SegmentTimingControls";
import { SegmentCueList } from "./segment/SegmentCueList";
import { SegmentContinuityCard } from "./segment/SegmentContinuityCard";
import { SegmentNavigationTabs } from "./segment/SegmentNavigationTabs";
import { SegmentNarrativeFields } from "./segment/SegmentNarrativeFields";
import { SegmentSaveButton } from "./segment/SegmentSaveButton";
import { useSegmentDraft } from "./segment/useSegmentDraft";
import { ScriptOverviewBox } from "./scriptReader/ScriptOverviewBox";
import { formatFullScriptText, formatScriptDialogueOnly } from "../utils/scriptText";
import { ScriptSeedSelector } from "./script/ScriptSeedSelector";

export interface SegmentEditorProps {
  segments: ReelSegment[];
  staleSegments?: SegmentIndex[];
  isSaving: boolean;
  onSaveSegment: (index: SegmentIndex, updated: ReelSegment) => Promise<void>;
  onChangeSegmentDraft: (updatedSegments: ReelSegment[]) => void;
  onGenerateScript?: () => void;
  isGenerating?: boolean;
  onCopyText?: (text: string, label?: string) => Promise<boolean>;
  topic?: ShortReelTopicSnapshot | null;
  source?: ShortReelSourceSnapshot | null;
  selectedSeedId?: string | null;
  onSelectSeed?: (seedId: string | null) => void;
}

export function SegmentEditor({
  segments,
  staleSegments = [],
  isSaving,
  onSaveSegment,
  onChangeSegmentDraft,
  onGenerateScript,
  isGenerating = false,
  onCopyText,
  topic,
  source,
  selectedSeedId,
  onSelectSeed,
}: SegmentEditorProps) {
  const [isCopiedFull, setIsCopiedFull] = useState(false);
  const [isCopiedDialogue, setIsCopiedDialogue] = useState(false);

  const { activeSegmentIndex, setActiveSegmentIndex, activeSegment, updateField, updateDuration, updateCueText, updateCueTiming } =
    useSegmentDraft(segments, onChangeSegmentDraft);

  if (!activeSegment) {
    return (
      <div className="short-reel-empty-card" role="region" aria-label="Segment Editor">
        <FilmReel size={32} weight="duotone" />
        <p>No script segments available. Generate a script or package first.</p>
        {source?.archetype_id && (
          <div style={{ maxWidth: "480px", width: "100%", margin: "12px auto 0", textAlign: "left" }}>
            <ScriptSeedSelector
              archetype={source.archetype_id}
              selectedSeedId={selectedSeedId ?? null}
              onSelectSeed={onSelectSeed ?? (() => {})}
              disabled={isGenerating}
            />
          </div>
        )}
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
  const totalDuration = segments.reduce((acc, s) => acc + s.duration_seconds, 0);

  const handleCopyFullScript = async () => {
    if (!onCopyText) return;
    const text = formatFullScriptText(segments, { topic, source });
    const ok = await onCopyText(text, "Full Script");
    if (ok) {
      setIsCopiedFull(true);
      setTimeout(() => setIsCopiedFull(false), 2500);
    }
  };

  const handleCopyDialogue = async () => {
    if (!onCopyText) return;
    const text = formatScriptDialogueOnly(segments);
    const ok = await onCopyText(text, "Script Dialogue");
    if (ok) {
      setIsCopiedDialogue(true);
      setTimeout(() => setIsCopiedDialogue(false), 2500);
    }
  };

  const handleEditSegmentFromReader = (index: SegmentIndex) => {
    setActiveSegmentIndex(index);
    const target = document.getElementById("segment-details-editor");
    target?.scrollIntoView?.({ behavior: "smooth" });
  };

  return (
    <section className="short-reel-card short-reel-segment-editor" aria-label="Segment Editor">
      <div className="short-reel-card-header short-reel-script-header">
        <div className="short-reel-card-title-group">
          <h3 className="short-reel-card-title">Script Segments</h3>
          <span className="short-reel-badge short-reel-badge-total">Total Duration: {totalDuration}s</span>
          <span className="short-reel-badge">{segments.length} Segments</span>
        </div>

        <div className="short-reel-header-actions short-reel-script-actions">
          <button
            type="button"
            className="short-reel-secondary-btn short-reel-copy-script-btn"
            onClick={handleCopyDialogue}
            aria-label="Copy Dialogue"
            title="Copy spoken voiceover dialogue only"
          >
            {isCopiedDialogue ? <Check size={14} weight="bold" /> : <MicrophoneStage size={14} />}
            <span>{isCopiedDialogue ? "Copied" : "Copy Dialogue"}</span>
          </button>

          <button
            type="button"
            className="short-reel-primary-btn short-reel-copy-script-btn"
            onClick={handleCopyFullScript}
            aria-label="Copy Script"
            title="Copy complete production script with narrative, dialogue, and cues"
          >
            {isCopiedFull ? <Check size={14} weight="bold" /> : <Copy size={14} />}
            <span>{isCopiedFull ? "Copied" : "Copy Script"}</span>
          </button>

          {onGenerateScript && (
            <button
              type="button"
              className="short-reel-secondary-btn"
              disabled={isGenerating}
              onClick={onGenerateScript}
              aria-label="Regenerate Script"
            >
              <Sparkle size={14} />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>

      {source?.archetype_id && (
        <ScriptSeedSelector
          archetype={source.archetype_id}
          selectedSeedId={selectedSeedId ?? null}
          onSelectSeed={onSelectSeed ?? (() => {})}
          disabled={isGenerating || isSaving}
        />
      )}

      <ScriptOverviewBox
        segments={segments}
        topic={topic}
        source={source}
        onEditSegment={handleEditSegmentFromReader}
        onCopyText={onCopyText}
      />

      <div id="segment-details-editor" className="short-reel-segment-editor-section">
        <div className="short-reel-section-divider">
          <h4 className="short-reel-section-subtitle">Segment Details & Continuity Editor</h4>
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
            dialogue={activeSegment.dialogue}
            audioDirection={activeSegment.audio_direction}
            onUpdateNarrative={(val) => updateField("narrative", val)}
            onUpdateDialogue={(val) => updateField("dialogue", val)}
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
      </div>
    </section>
  );
}
