import { Sparkle, ArrowCounterClockwise, PencilSimple, CircleNotch, Plus, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { type MascotStateVariant, findPoseByPrompt, getMascotSlotDefaultPreset } from "@studio/shared";

export interface VariantSlotCardProps {
  state: "thinking" | "celebrate";
  slotIndex: number;
  variant?: MascotStateVariant | null;
  isBusy: boolean;
  statusText?: string;
  onGenerate: (slotIndex: number) => void;
  onRegenerate: (slotIndex: number) => void;
  onEditPrompt: (slotIndex: number) => void;
  onOpenLightbox?: (url: string) => void;
}

export function VariantSlotCard({
  state,
  slotIndex,
  variant,
  isBusy,
  statusText = "Generating pose...",
  onGenerate,
  onRegenerate,
  onEditPrompt,
  onOpenLightbox,
}: VariantSlotCardProps) {
  const isFilled = Boolean(variant?.image_url);
  const promptModifier = variant?.prompt_modifier?.trim() || "";
  const hasCustomPrompt = Boolean(promptModifier);

  // Look up pose preset details from the 20-pose library
  const knownPose = promptModifier ? findPoseByPrompt(state, promptModifier) : undefined;
  const defaultSlotPreset = getMascotSlotDefaultPreset(state, slotIndex);
  const defaultPose = findPoseByPrompt(state, defaultSlotPreset);

  const poseBadgeLabel = knownPose ? knownPose.label : promptModifier ? "Customized" : isFilled && defaultPose ? defaultPose.label : null;

  const poseTooltip = promptModifier
    ? knownPose
      ? `${knownPose.label}: "${promptModifier}"`
      : `Custom Prompt: "${promptModifier}"`
    : `Default Slot ${slotIndex}: "${defaultSlotPreset}"`;

  return (
    <div
      className={`variant-slot-card ${isFilled ? "is-filled" : "is-empty"} ${isBusy ? "is-busy" : ""}`}
      data-slot-index={slotIndex}
      data-slot-state={state}
      title={poseTooltip}
    >
      {/* Slot Header */}
      <div className="variant-slot-header">
        <span className="slot-number-badge">Slot {slotIndex}</span>
        <div className="slot-header-tags">
          {poseBadgeLabel ? (
            <span className="slot-custom-tag" title={poseTooltip}>
              {poseBadgeLabel}
            </span>
          ) : null}
        </div>
      </div>

      {/* Card Content Area */}
      <div className="slot-canvas-container">
        {isFilled && variant?.image_url ? (
          <div className="slot-checkerboard-canvas">
            <img src={variant.image_url} alt={`${state} variant slot ${slotIndex}`} className="slot-variant-img" loading="lazy" />
            {onOpenLightbox ? (
              <button
                type="button"
                className="slot-zoom-btn"
                title="View Full Size"
                aria-label="View Full Size"
                onClick={() => onOpenLightbox(variant.image_url)}
              >
                <MagnifyingGlassPlus size={16} />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="slot-empty-placeholder">
            <div className="slot-empty-icon-wrap">
              <Plus size={24} weight="bold" />
            </div>
            <span className="slot-empty-text">Empty Slot</span>
          </div>
        )}

        {/* Busy Overlay */}
        {isBusy ? (
          <div className="slot-busy-overlay" role="status" aria-live="polite">
            <CircleNotch size={26} className="spin slot-busy-spinner" />
            <span className="slot-busy-text">{statusText}</span>
          </div>
        ) : null}
      </div>

      {/* Card Footer Actions */}
      <div className="slot-card-actions">
        {isFilled ? (
          <>
            <button
              type="button"
              className="slot-action-btn is-regen"
              onClick={() => onRegenerate(slotIndex)}
              disabled={isBusy}
              title="Regenerate with an unused pose from library"
            >
              <ArrowCounterClockwise size={13} weight="bold" />
              <span>Regenerate</span>
            </button>
            <button
              type="button"
              className="slot-action-btn is-edit-prompt"
              onClick={() => onEditPrompt(slotIndex)}
              disabled={isBusy}
              title="Edit action prompt modifier"
            >
              <PencilSimple size={13} />
              <span>Edit Prompt</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="slot-action-btn is-generate" onClick={() => onGenerate(slotIndex)} disabled={isBusy}>
              <Sparkle size={13} weight="fill" />
              <span>Generate</span>
            </button>
            <button
              type="button"
              className="slot-action-btn is-pre-prompt"
              onClick={() => onEditPrompt(slotIndex)}
              disabled={isBusy}
              title="Add prompt modifier before generating"
            >
              <PencilSimple size={13} />
              <span>{hasCustomPrompt ? "Edit Prompt" : "Add Prompt"}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
