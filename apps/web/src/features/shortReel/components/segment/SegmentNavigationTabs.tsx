import { Warning } from "@phosphor-icons/react";
import type { ReelSegment, SegmentIndex } from "@studio/shared";

export interface SegmentNavigationTabsProps {
  segments: ReelSegment[];
  activeSegmentIndex: SegmentIndex;
  staleSegments: SegmentIndex[];
  onSelectSegment: (index: SegmentIndex) => void;
  isCurrentSegmentStale?: boolean;
}

export function SegmentNavigationTabs({
  segments,
  activeSegmentIndex,
  staleSegments,
  onSelectSegment,
  isCurrentSegmentStale,
}: SegmentNavigationTabsProps) {
  return (
    <>
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
              onClick={() => onSelectSegment(idx)}
            >
              <div className="short-reel-segment-tab-content">
                <span className="short-reel-segment-tab-title">Segment {idx}</span>
                <span className="short-reel-segment-tab-sub">
                  {seg ? `${seg.duration_seconds}s • ${seg.mode}` : "Empty"}
                </span>
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

      {isCurrentSegmentStale && (
        <div className="short-reel-alert short-reel-alert-warning" role="alert">
          <Warning size={18} weight="fill" />
          <div className="short-reel-alert-body">
            <strong>Downstream Segment Stale</strong>
            <p>Edits to preceding segments require reviewing or resaving this segment to re-align continuity.</p>
          </div>
        </div>
      )}
    </>
  );
}
