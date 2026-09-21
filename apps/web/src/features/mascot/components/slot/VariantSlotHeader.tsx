import { CircleNotch } from "@phosphor-icons/react";
import { findPoseByPrompt, getMascotSlotDefaultPreset } from "@studio/shared";

export interface SlotPoseMetadata {
  poseBadgeLabel: string | null;
  poseTooltip: string;
}

export function resolveSlotPoseMetadata(
  state: "thinking" | "celebrate",
  slotIndex: number,
  promptModifier: string,
  isFilled: boolean,
): SlotPoseMetadata {
  const knownPose = promptModifier ? findPoseByPrompt(state, promptModifier) : undefined;
  const defaultSlotPreset = getMascotSlotDefaultPreset(state, slotIndex);
  const defaultPose = findPoseByPrompt(state, defaultSlotPreset);

  const poseBadgeLabel = knownPose ? knownPose.label : promptModifier ? "Customized" : isFilled && defaultPose ? defaultPose.label : null;

  const poseTooltip = promptModifier
    ? knownPose
      ? `${knownPose.label}: "${promptModifier}"`
      : `Custom Prompt: "${promptModifier}"`
    : `Default Slot ${slotIndex}: "${defaultSlotPreset}"`;

  return { poseBadgeLabel, poseTooltip };
}

export interface VariantSlotHeaderProps {
  slotIndex: number;
  state?: "thinking" | "celebrate";
  isQueued?: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  onToggleSelect?: (selected: boolean) => void;
  poseBadgeLabel: string | null;
  poseTooltip: string;
}

export function VariantSlotHeader({
  slotIndex,
  state,
  isQueued = false,
  isSelected = false,
  isSelectable = true,
  onToggleSelect,
  poseBadgeLabel,
  poseTooltip,
}: VariantSlotHeaderProps) {
  const checkboxAriaLabel = state ? `Select ${state} slot ${slotIndex}` : `Select slot ${slotIndex}`;

  return (
    <div className="variant-slot-header">
      <div className="slot-header-left">
        {onToggleSelect ? (
          <label className="slot-select-checkbox-label" title={checkboxAriaLabel}>
            <input
              type="checkbox"
              className="slot-select-checkbox"
              checked={isSelected}
              disabled={!isSelectable}
              onChange={(e) => onToggleSelect(e.target.checked)}
              aria-label={checkboxAriaLabel}
            />
          </label>
        ) : null}
        <span className="slot-number-badge">Slot {slotIndex}</span>
      </div>
      <div className="slot-header-tags">
        {isQueued ? (
          <span className="slot-queued-tag" title="In queue for batch generation">
            <CircleNotch size={10} className="spin" />
            <span>Queued</span>
          </span>
        ) : poseBadgeLabel ? (
          <span className="slot-custom-tag" title={poseTooltip}>
            {poseBadgeLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
