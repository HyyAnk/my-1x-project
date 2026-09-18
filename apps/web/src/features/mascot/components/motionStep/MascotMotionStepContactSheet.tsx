import type { MascotPublishedAnimationAsset } from "@studio/shared";
import { AnimationContactSheet } from "../../animation";

export interface MascotMotionStepContactSheetProps {
  showContactSheet: boolean;
  animation: MascotPublishedAnimationAsset | null;
  activeFrameIndex: number;
  onSelectFrame: (frameIndex: number) => void;
}

export function MascotMotionStepContactSheet({
  showContactSheet,
  animation,
  activeFrameIndex,
  onSelectFrame,
}: MascotMotionStepContactSheetProps) {
  if (!showContactSheet || !animation) {
    return null;
  }

  return (
    <div
      style={{
        background: "var(--surface, #1e293b)",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
        borderRadius: "var(--radius, 10px)",
        padding: "16px",
      }}
      data-testid="step4-contact-sheet-wrap"
    >
      <AnimationContactSheet animation={animation} activeFrameIndex={activeFrameIndex} onSelectFrame={onSelectFrame} />
    </div>
  );
}
