import { SlotCardStatusBadge } from "./SlotCardStatusBadge";

export interface SlotCardHeaderProps {
  slotIndex: number;
  attempt: number;
  status: string;
  isReady: boolean;
  isQueued: boolean;
  isProcessing: boolean;
  isFailed: boolean;
  errorMessage?: string | null;
}

export function SlotCardHeader({
  slotIndex,
  attempt,
  status,
  isReady,
  isQueued,
  isProcessing,
  isFailed,
  errorMessage,
}: SlotCardHeaderProps) {
  return (
    <div className="anim-slot-header">
      <div className="anim-slot-header-left">
        <span className="anim-slot-number">Slot {slotIndex}</span>
        {attempt > 0 ? <span className="anim-attempt-tag">Attempt #{attempt}</span> : null}
      </div>
      <div className="anim-slot-header-right">
        <SlotCardStatusBadge
          status={status}
          isReady={isReady}
          isQueued={isQueued}
          isProcessing={isProcessing}
          isFailed={isFailed}
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
}
