import { WarningCircle } from "@phosphor-icons/react";

export interface SlotCardFailedBoxProps {
  errorCode?: string | null;
  errorMessage?: string | null;
}

export function SlotCardFailedBox({ errorCode, errorMessage }: SlotCardFailedBoxProps) {
  return (
    <div className="anim-slot-failed-box">
      <WarningCircle size={26} className="anim-failed-icon" />
      {errorCode ? <span className="anim-error-code-badge">{errorCode}</span> : null}
      <p className="anim-error-description">{errorMessage || "Video processing or QA check failed"}</p>
    </div>
  );
}
