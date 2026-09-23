import { useState } from "react";
import {
  PencilSimple,
  MicrophoneStage,
  VideoCamera,
  SpeakerHigh,
  TextT,
  Copy,
  Check,
} from "@phosphor-icons/react";
import type { ReelSegment, SegmentIndex } from "@studio/shared";
import { formatTimingRange } from "../../utils/scriptText";

export interface ScriptSegmentTimelineCardProps {
  segment: ReelSegment;
  startSeconds: number;
  endSeconds: number;
  onEditSegment?: (index: SegmentIndex) => void;
  onCopyText?: (text: string, label?: string) => Promise<boolean>;
}

export function ScriptSegmentTimelineCard({
  segment,
  startSeconds,
  endSeconds,
  onEditSegment,
  onCopyText,
}: ScriptSegmentTimelineCardProps) {
  const [copiedDialogue, setCopiedDialogue] = useState(false);

  const handleCopySingleDialogue = async () => {
    if (!segment.dialogue || !onCopyText) return;
    const ok = await onCopyText(segment.dialogue, `Segment ${segment.index} dialogue`);
    if (ok) {
      setCopiedDialogue(true);
      setTimeout(() => setCopiedDialogue(false), 2000);
    }
  };

  return (
    <article className="short-reel-storyboard-card" aria-label={`Segment ${segment.index} Storyboard`}>
      <header className="short-reel-storyboard-card-header">
        <div className="short-reel-storyboard-meta">
          <span className="short-reel-segment-number">Scene #{segment.index}</span>
          <span className="short-reel-segment-timing">
            {formatTimingRange(startSeconds, endSeconds)} • {segment.duration_seconds}s
          </span>
          <span className="short-reel-tag short-reel-tag-native">{segment.mode}</span>
        </div>

        {onEditSegment && (
          <button
            type="button"
            className="short-reel-storyboard-edit-btn"
            onClick={() => onEditSegment(segment.index)}
            aria-label={`Edit Segment ${segment.index}`}
          >
            <PencilSimple size={13} />
            <span>Edit Segment</span>
          </button>
        )}
      </header>

      <div className="short-reel-storyboard-content">
        {segment.dialogue ? (
          <div className="short-reel-dialogue-box">
            <div className="short-reel-dialogue-header">
              <span className="short-reel-dialogue-tag">
                <MicrophoneStage size={13} weight="fill" />
                <span>Spoken Dialogue</span>
              </span>
              {onCopyText && (
                <button
                  type="button"
                  className="short-reel-icon-btn short-reel-dialogue-copy-btn"
                  onClick={handleCopySingleDialogue}
                  aria-label={`Copy Segment ${segment.index} dialogue`}
                  title="Copy this dialogue line"
                >
                  {copiedDialogue ? <Check size={12} weight="bold" /> : <Copy size={12} />}
                </button>
              )}
            </div>
            <p className="short-reel-dialogue-text">“{segment.dialogue}”</p>
          </div>
        ) : (
          <div className="short-reel-dialogue-box short-reel-dialogue-empty">
            <span className="short-reel-dialogue-tag">
              <MicrophoneStage size={13} />
              <span>No Spoken Dialogue</span>
            </span>
            <p className="short-reel-dialogue-text-muted">Visual scene & sound effects only</p>
          </div>
        )}

        <div className="short-reel-storyboard-section">
          <span className="short-reel-storyboard-label">
            <VideoCamera size={13} />
            <span>Visual Narrative</span>
          </span>
          <p className="short-reel-storyboard-narrative">{segment.narrative}</p>
        </div>

        {segment.text_cues && segment.text_cues.length > 0 && (
          <div className="short-reel-storyboard-section">
            <span className="short-reel-storyboard-label">
              <TextT size={13} />
              <span>On-Screen Graphics ({segment.text_cues.length})</span>
            </span>
            <div className="short-reel-cues-chips">
              {segment.text_cues.map((cue, cIdx) => (
                <div key={cIdx} className="short-reel-cue-chip">
                  <span className={`short-reel-cue-role short-reel-cue-role-${cue.role}`}>{cue.role}</span>
                  <span className="short-reel-cue-text">“{cue.text}”</span>
                  <span className="short-reel-cue-time">
                    {cue.start_seconds}s - {cue.end_seconds}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {segment.audio_direction && (
          <div className="short-reel-storyboard-section">
            <span className="short-reel-storyboard-label">
              <SpeakerHigh size={13} />
              <span>Audio Direction</span>
            </span>
            <p className="short-reel-storyboard-audio">{segment.audio_direction}</p>
          </div>
        )}
      </div>
    </article>
  );
}
