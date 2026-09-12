import type { ReelSegment } from "@studio/shared";

export interface SegmentContinuityCardProps {
  endState: ReelSegment["end_state"];
}

export function SegmentContinuityCard({ endState }: SegmentContinuityCardProps) {
  return (
    <div className="short-reel-form-group">
      <label className="short-reel-label">
        <span>Continuity End State</span>
      </label>
      <div className="short-reel-continuity-box">
        <div>
          <strong>Position:</strong> {endState.position}
        </div>
        <div>
          <strong>Action:</strong> {endState.action}
        </div>
        <div>
          <strong>Camera:</strong> {endState.camera}
        </div>
        <div>
          <strong>Environment:</strong> {endState.environment}
        </div>
      </div>
    </div>
  );
}
