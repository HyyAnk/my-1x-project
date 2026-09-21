import { type MascotStateVariant, isMascotVariantAvailable, isMockFixtureIdentifier } from "@studio/shared";
import { VariantSlotHeader, resolveSlotPoseMetadata, VariantSlotFilledView, VariantSlotEmptyView } from "./slot";

export interface VariantSlotCardProps {
  state: "thinking" | "celebrate";
  slotIndex: number;
  variant?: MascotStateVariant | null;
  isBusy: boolean;
  isQueued?: boolean;
  statusText?: string;
  isSelected?: boolean;
  onToggleSelect?: (slotIndex: number, selected: boolean) => void;
  isSelectable?: boolean;
  onGenerate: (slotIndex: number) => void;
  onRegenerate: (slotIndex: number) => void;
  onEditPrompt: (slotIndex: number) => void;
  onOpenLightbox?: (url: string) => void;
  onDownloadOriginal?: (url: string) => void;
  onDownloadTransparent?: (url: string) => void;
}

export function VariantSlotCard(props: VariantSlotCardProps) {
  const {
    state,
    slotIndex,
    variant,
    isBusy,
    isQueued = false,
    isSelected = false,
    onToggleSelect,
    isSelectable = !isBusy && !isQueued,
    onGenerate,
    onEditPrompt,
  } = props;
  const imageUrl = variant?.image_url && !isMockFixtureIdentifier(variant.image_url) ? variant.image_url : null;
  const isFilled = isMascotVariantAvailable(variant) && Boolean(imageUrl);
  const promptModifier = variant?.prompt_modifier?.trim() || "";

  const { poseBadgeLabel, poseTooltip } = resolveSlotPoseMetadata(state, slotIndex, promptModifier, isFilled);

  return (
    <div
      className={`variant-slot-card ${isFilled ? "is-filled" : "is-empty"} ${isBusy ? "is-busy" : ""} ${isQueued ? "is-queued" : ""} ${isSelected ? "is-selected" : ""}`}
      data-slot-index={slotIndex}
      data-slot-state={state}
      title={poseTooltip}
    >
      <VariantSlotHeader
        slotIndex={slotIndex}
        state={state}
        isQueued={isQueued}
        isSelected={isSelected}
        isSelectable={isSelectable}
        onToggleSelect={onToggleSelect ? (checked) => onToggleSelect(slotIndex, checked) : undefined}
        poseBadgeLabel={poseBadgeLabel}
        poseTooltip={poseTooltip}
      />

      {isFilled && imageUrl ? (
        <VariantSlotFilledView {...props} imageUrl={imageUrl} />
      ) : (
        <VariantSlotEmptyView
          slotIndex={slotIndex}
          isBusy={isBusy}
          isQueued={isQueued}
          statusText={props.statusText}
          hasCustomPrompt={Boolean(promptModifier)}
          onGenerate={onGenerate}
          onEditPrompt={onEditPrompt}
        />
      )}
    </div>
  );
}
