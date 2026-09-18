import { CircleNotch } from "@phosphor-icons/react";

export interface VariantSlotProgressViewProps {
  isBusy: boolean;
  statusText?: string;
}

export function VariantSlotProgressView({ isBusy, statusText = "Generating pose..." }: VariantSlotProgressViewProps) {
  if (!isBusy) {
    return null;
  }

  return (
    <div className="slot-busy-overlay" role="status" aria-live="polite">
      <CircleNotch size={26} className="spin slot-busy-spinner" />
      <span className="slot-busy-text">{statusText}</span>
    </div>
  );
}
