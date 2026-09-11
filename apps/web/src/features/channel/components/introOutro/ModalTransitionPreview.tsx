import React from "react";
import { ArrowCounterClockwise, Eye, EyeSlash, Sparkle } from "@phosphor-icons/react";
import { TransitionPreviewPlayer } from "../../../transitions/components/TransitionPreviewPlayer";
import type { TransitionThemeColors } from "../../../transitions/types/transitionPreview.types";

export interface ModalTransitionPreviewProps {
  transitionType: string;
  durationSeconds: number;
  playTrigger?: number;
  onReplay?: () => void;
  themeColors?: TransitionThemeColors;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export const ModalTransitionPreview: React.FC<ModalTransitionPreviewProps> = ({
  transitionType,
  durationSeconds,
  playTrigger,
  onReplay,
  themeColors,
  isVisible,
  onToggleVisibility,
}) => {
  return (
    <div className="modal-transition-preview-wrapper" data-testid="modal-transition-preview-section">
      <div className="modal-transition-preview-header">
        <div className="modal-transition-preview-title">
          <Sparkle size={15} weight="fill" style={{ color: "var(--accent)" }} />
          <span>Transition Preview</span>
        </div>

        <div className="modal-transition-preview-actions">
          {isVisible && onReplay && (
            <button
              type="button"
              className="modal-transition-action-btn"
              onClick={onReplay}
              title="Replay transition preview"
              aria-label="Replay transition preview"
              data-testid="modal-transition-replay-btn"
            >
              <ArrowCounterClockwise size={13} weight="bold" />
              <span>Replay</span>
            </button>
          )}

          <button
            type="button"
            className="modal-transition-toggle-btn"
            onClick={onToggleVisibility}
            aria-label={isVisible ? "Hide preview" : "Show preview"}
            data-testid="modal-transition-toggle-btn"
          >
            {isVisible ? (
              <>
                <EyeSlash size={13} />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye size={13} />
                <span>Show Preview</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isVisible && (
        <div className="modal-transition-player-container">
          <TransitionPreviewPlayer
            transitionType={transitionType}
            durationSeconds={durationSeconds}
            playTrigger={playTrigger}
            autoPlay={Boolean(playTrigger && playTrigger > 0)}
            themeColors={themeColors}
            className="modal-transition-mini-player"
            aspectRatio="16:9"
            showControls={true}
          />
        </div>
      )}
    </div>
  );
};
