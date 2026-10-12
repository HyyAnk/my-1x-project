import { X } from "@phosphor-icons/react";
import { AccessibleModal } from "../../../components/AccessibleModal";
import { quizShortBookendApi } from "../../../api/quizShortBookendApi";
import type { ShortBookendPreview } from "../types/shortIntroOutro.types";

type Props = {
  channelId: string;
  preview: ShortBookendPreview | null;
  onClose: () => void;
};

/** Plays one portrait Short intro or outro clip. */
export function ShortBookendPreviewModal({ channelId, preview, onClose }: Props) {
  if (!preview) return null;
  return (
    <AccessibleModal titleId="short-bookend-preview-title" onDismiss={onClose}>
      <div className="short-bookend-preview">
        <header>
          <h3 id="short-bookend-preview-title">{preview.title}</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close preview">
            <X size={18} />
          </button>
        </header>
        <video src={quizShortBookendApi.clipUrl(channelId, preview.pairId, preview.kind)} controls autoPlay playsInline />
      </div>
    </AccessibleModal>
  );
}
