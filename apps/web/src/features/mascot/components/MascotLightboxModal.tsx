import { DownloadSimple, X } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export interface MascotLightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
  altText?: string;
  downloadFilename?: string;
}

export function MascotLightboxModal({
  imageUrl,
  onClose,
  altText = "Master Concept Large Preview",
  downloadFilename = "concept_image.png",
}: MascotLightboxModalProps) {
  const { t } = useTranslation();

  if (!imageUrl) return null;

  return (
    <div className="modal-backdrop lightbox-backdrop" role="presentation" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-header-actions">
          <a
            href={imageUrl}
            download={downloadFilename}
            className="lightbox-action-btn"
            title={t("common.download")}
            aria-label={t("common.download")}
            target="_blank"
            rel="noreferrer"
          >
            <DownloadSimple size={18} />
          </a>
          <button type="button" className="lightbox-close-btn" onClick={onClose} title={t("common.close")} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </div>
        <img src={imageUrl} alt={altText} className="lightbox-img" />
      </div>
    </div>
  );
}
