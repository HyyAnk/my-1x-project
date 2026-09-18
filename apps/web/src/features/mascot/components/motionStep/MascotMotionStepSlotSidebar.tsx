import type { AnimationState, MascotPlacementV2, MascotSlotProjection } from "@studio/shared";
import { PlacementSettingsControls, Step4SlotDetails, Step4SlotPicker } from "../../animation";

export interface MascotMotionStepSlotSidebarProps {
  activeState: AnimationState;
  onChangeState: (state: AnimationState) => void;
  activeSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
  slotsData: {
    thinking: MascotSlotProjection[];
    celebrate: MascotSlotProjection[];
  };
  activeSlot?: MascotSlotProjection;
  previewMode: "canvas" | "stage";
  placement: MascotPlacementV2;
  onChangePlacement: (placement: MascotPlacementV2) => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  onGoToStep3: () => void;
}

export function MascotMotionStepSlotSidebar({
  activeState,
  onChangeState,
  activeSlotIndex,
  onSelectSlot,
  slotsData,
  activeSlot,
  previewMode,
  placement,
  onChangePlacement,
  showGuides,
  onToggleGuides,
  onGoToStep3,
}: MascotMotionStepSlotSidebarProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Step4SlotPicker
        activeState={activeState}
        onChangeState={onChangeState}
        activeSlotIndex={activeSlotIndex}
        onSelectSlot={onSelectSlot}
        slots={slotsData}
      />

      {previewMode === "stage" && (
        <PlacementSettingsControls
          placement={placement}
          onChangePlacement={onChangePlacement}
          showGuides={showGuides}
          onToggleGuides={onToggleGuides}
        />
      )}

      <Step4SlotDetails state={activeState} slotIndex={activeSlotIndex} slot={activeSlot} onGoToStep3={onGoToStep3} />
    </div>
  );
}
