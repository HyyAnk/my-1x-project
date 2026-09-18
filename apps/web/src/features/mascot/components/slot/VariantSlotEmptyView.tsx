import { CircleNotch, PencilSimple, Plus, Sparkle } from "@phosphor-icons/react";
import { VariantSlotProgressView } from "./VariantSlotProgressView";

export interface VariantSlotEmptyViewProps {
  slotIndex: number;
  isBusy: boolean;
  isQueued?: boolean;
  statusText?: string;
  hasCustomPrompt: boolean;
  onGenerate: (slotIndex: number) => void;
  onEditPrompt: (slotIndex: number) => void;
}

export function VariantSlotEmptyView({
  slotIndex,
  isBusy,
  isQueued = false,
  statusText = "Generating pose...",
  hasCustomPrompt,
  onGenerate,
  onEditPrompt,
}: VariantSlotEmptyViewProps) {
  return (
    <>
      <div className="slot-canvas-container">
        <div className="slot-empty-placeholder">
          <div className="slot-empty-icon-wrap">
            <Plus size={24} weight="bold" />
          </div>
          <span className="slot-empty-text">{isQueued ? "Waiting in Queue..." : "No variant generated"}</span>
        </div>
        <VariantSlotProgressView isBusy={isBusy} statusText={statusText} />
      </div>

      <div className="slot-card-actions">
        <button
          type="button"
          className={`slot-action-btn is-generate ${isBusy ? "is-generating" : ""} ${isQueued ? "is-queued" : ""}`}
          onClick={() => onGenerate(slotIndex)}
          disabled={isBusy || isQueued}
          title={isQueued ? "Waiting in queue..." : undefined}
        >
          {isBusy ? (
            <>
              <CircleNotch size={13} className="spin" />
              <span>Generating...</span>
            </>
          ) : isQueued ? (
            <>
              <CircleNotch size={13} className="spin" />
              <span>Queued...</span>
            </>
          ) : (
            <>
              <Sparkle size={13} weight="fill" />
              <span>Generate</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="slot-action-btn is-pre-prompt"
          onClick={() => onEditPrompt(slotIndex)}
          disabled={isBusy || isQueued}
          title="Add prompt modifier before generating"
        >
          <PencilSimple size={13} />
          <span>{hasCustomPrompt ? "Edit Prompt" : "Add Prompt"}</span>
        </button>
      </div>
    </>
  );
}
