import { useState } from "react";
import { Copy, Check, Question, Lightbulb, Code } from "@phosphor-icons/react";
import type { ReelSegment, SegmentIndex, ShortReelTopicSnapshot, ShortReelSourceSnapshot } from "@studio/shared";
import { getSegmentsWithCumulativeTimings, formatFullScriptText } from "../../utils/scriptText";
import { ScriptSegmentTimelineCard } from "./ScriptSegmentTimelineCard";

export interface ScriptOverviewBoxProps {
  segments: ReelSegment[];
  topic?: ShortReelTopicSnapshot | null;
  source?: ShortReelSourceSnapshot | null;
  onEditSegment?: (index: SegmentIndex) => void;
  onCopyText?: (text: string, label?: string) => Promise<boolean>;
}

export function ScriptOverviewBox({
  segments,
  topic,
  source,
  onEditSegment,
  onCopyText,
}: ScriptOverviewBoxProps) {
  const [showRawText, setShowRawText] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const timedSegments = getSegmentsWithCumulativeTimings(segments);
  const fullScriptFormatted = formatFullScriptText(segments, { topic, source });

  const handleCopyRaw = async () => {
    if (!onCopyText) return;
    const ok = await onCopyText(fullScriptFormatted, "Full Script");
    if (ok) {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  return (
    <div className="short-reel-script-reader" role="region" aria-label="Full Script Reader">
      {(topic?.hook || source?.question_text) && (
        <div className="short-reel-story-recap">
          {topic?.hook && (
            <div className="short-reel-recap-item short-reel-recap-hook">
              <Lightbulb size={16} weight="fill" className="short-reel-recap-icon" />
              <div className="short-reel-recap-text">
                <strong className="short-reel-recap-label">Hook:</strong>
                <span>{topic.hook}</span>
              </div>
            </div>
          )}

          {source?.question_text && (
            <div className="short-reel-recap-item short-reel-recap-question">
              <Question size={16} weight="bold" className="short-reel-recap-icon" />
              <div className="short-reel-recap-text">
                <strong className="short-reel-recap-label">Target Question:</strong>
                <span>{source.question_text}</span>
                {source.selected_answer_text && (
                  <span className="short-reel-recap-answer">
                    ➔ Correct Answer: <strong>{source.selected_answer_text}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="short-reel-storyboard-timeline">
        {timedSegments.map(({ segment, start, end }) => (
          <ScriptSegmentTimelineCard
            key={segment.index}
            segment={segment}
            startSeconds={start}
            endSeconds={end}
            onEditSegment={onEditSegment}
            onCopyText={onCopyText}
          />
        ))}
      </div>

      <div className="short-reel-raw-script-section">
        <div className="short-reel-raw-script-header">
          <button
            type="button"
            className="short-reel-raw-toggle-btn"
            onClick={() => setShowRawText((prev) => !prev)}
            aria-expanded={showRawText}
          >
            <Code size={14} />
            <span>{showRawText ? "Hide Formatted Script Text" : "View Formatted Script Text"}</span>
          </button>

          {onCopyText && (
            <button
              type="button"
              className="short-reel-secondary-btn short-reel-raw-copy-btn"
              onClick={handleCopyRaw}
              aria-label="Copy Full Script Text"
            >
              {copiedRaw ? <Check size={14} weight="bold" /> : <Copy size={14} />}
              <span>{copiedRaw ? "Copied" : "Copy Full Script Text"}</span>
            </button>
          )}
        </div>

        {showRawText && (
          <pre className="short-reel-raw-script-pre" tabIndex={0} aria-label="Formatted Full Script Output">
            {fullScriptFormatted}
          </pre>
        )}
      </div>
    </div>
  );
}
