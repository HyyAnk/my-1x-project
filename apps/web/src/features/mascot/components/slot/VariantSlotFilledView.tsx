import { ArrowCounterClockwise, CircleNotch, DownloadSimple, MagnifyingGlassPlus, PencilSimple } from "@phosphor-icons/react";
import type { MascotStateVariant } from "@studio/shared";
import { triggerBrowserDownload } from "../../../../utils/browserDownload";
import { VariantSlotProgressView } from "./VariantSlotProgressView";

export interface VariantSlotFilledViewProps {
  state: "thinking" | "celebrate";
  slotIndex: number;
  imageUrl: string;
  variant?: MascotStateVariant | null;
  isBusy: boolean;
  isQueued?: boolean;
  statusText?: string;
  onGenerate?: (slotIndex: number) => void;
  onRegenerate: (slotIndex: number) => void;
  onEditPrompt: (slotIndex: number) => void;
  onOpenLightbox?: (url: string) => void;
  onDownloadOriginal?: (url: string) => void;
  onDownloadTransparent?: (url: string) => void;
}

export function VariantSlotFilledView({
  state,
  slotIndex,
  imageUrl,
  variant,
  isBusy,
  isQueued = false,
  statusText = "Generating pose...",
  onRegenerate,
  onEditPrompt,
  onOpenLightbox,
  onDownloadOriginal,
  onDownloadTransparent,
}: VariantSlotFilledViewProps) {
  const rawOriginalUrl = variant?.raw_image_url || variant?.image_url || "";
  const rawTransparentUrl =
    variant?.transparent_image_url ||
    (imageUrl.includes("/assets/transparent/") ? imageUrl : imageUrl.replace("/assets/", "/assets/transparent/"));

  return (
    <>
      <div className="slot-canvas-container">
        <div className="slot-checkerboard-canvas">
          <img
            src={imageUrl}
            alt={`${state} variant slot ${slotIndex}`}
            className="slot-variant-img"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          {onOpenLightbox ? (
            <button
              type="button"
              className="slot-zoom-btn"
              title="View Full Size"
              aria-label="View Full Size"
              onClick={() => onOpenLightbox(imageUrl)}
            >
              <MagnifyingGlassPlus size={16} />
            </button>
          ) : null}

          {/* Dual Downloads: Original and Transparent PNG preserving 16:9 canvas */}
          <div className="slot-downloads-overlay" role="group" aria-label="Download options">
            <button
              type="button"
              className="slot-download-btn is-original"
              title="Download original image with background"
              aria-label="Download original image with background"
              onClick={() => {
                if (onDownloadOriginal) {
                  onDownloadOriginal(rawOriginalUrl);
                } else {
                  triggerBrowserDownload(rawOriginalUrl, `${state}_slot_${slotIndex}_original.png`);
                }
              }}
            >
              <DownloadSimple size={12} weight="bold" />
              <span>Original PNG</span>
            </button>
            <button
              type="button"
              className="slot-download-btn is-transparent"
              title="Download background-removed PNG"
              aria-label="Download background-removed PNG"
              onClick={() => {
                if (onDownloadTransparent) {
                  onDownloadTransparent(rawTransparentUrl);
                } else {
                  triggerBrowserDownload(rawTransparentUrl, `${state}_slot_${slotIndex}_transparent.png`);
                }
              }}
            >
              <DownloadSimple size={12} weight="bold" />
              <span>Transparent PNG</span>
            </button>
          </div>
        </div>

        <VariantSlotProgressView isBusy={isBusy} statusText={statusText} />
      </div>

      <div className="slot-card-actions">
        <button
          type="button"
          className={`slot-action-btn is-regen ${isBusy ? "is-generating" : ""} ${isQueued ? "is-queued" : ""}`}
          onClick={() => onRegenerate(slotIndex)}
          disabled={isBusy || isQueued}
          title={isQueued ? "Waiting in queue..." : "Regenerate with an unused pose from library"}
        >
          {isBusy ? (
            <>
              <CircleNotch size={13} className="spin" />
              <span>Regenerating...</span>
            </>
          ) : isQueued ? (
            <>
              <CircleNotch size={13} className="spin" />
              <span>Queued...</span>
            </>
          ) : (
            <>
              <ArrowCounterClockwise size={13} weight="bold" />
              <span>Regenerate</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="slot-action-btn is-edit-prompt"
          onClick={() => onEditPrompt(slotIndex)}
          disabled={isBusy || isQueued}
          title="Edit action prompt modifier"
        >
          <PencilSimple size={13} />
          <span>Edit Prompt</span>
        </button>
      </div>
    </>
  );
}
