import { CircleNotch, MagnifyingGlassPlus, Sparkle, DownloadSimple } from "@phosphor-icons/react";
import type { MascotStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface MascotStyleAnchorCanvasProps {
  style: MascotStyle;
  imageUrl?: string | null;
  rawImageUrl?: string | null;
  sanitizedMascotName: string;
  sanitizedStyleName: string;
  hasImage: boolean;
  isThisGenerating: boolean;
  isBusy: boolean;
  onOpenLightbox?: (url: string) => void;
  onGenerate: () => void;
}

export function MascotStyleAnchorCanvas({
  style,
  imageUrl,
  rawImageUrl,
  sanitizedMascotName,
  sanitizedStyleName,
  hasImage,
  isThisGenerating,
  isBusy,
  onOpenLightbox,
  onGenerate,
}: MascotStyleAnchorCanvasProps) {
  const { t } = useTranslation();

  return (
    <div className="style-anchor-canvas">
      {isThisGenerating ? (
        <div className="style-anchor-generating-overlay">
          <CircleNotch size={24} className="spin" />
          <span>{t("mascots.generatingConceptBtn")}</span>
        </div>
      ) : hasImage && imageUrl ? (
        <div
          className="style-anchor-thumb-wrap"
          onClick={() => onOpenLightbox?.(imageUrl)}
          role="button"
          tabIndex={0}
          aria-label={t("mascots.zoomPreviewBtn")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpenLightbox?.(imageUrl))}
        >
          <img src={imageUrl} alt={style.name} className="style-anchor-thumb" loading="lazy" />
          <div className="style-anchor-hover-actions">
            {rawImageUrl && (
              <a
                href={rawImageUrl}
                download={`${sanitizedMascotName}_${sanitizedStyleName}_raw.png`}
                className="style-anchor-action-btn"
                title={t("mascots.downloadRawBtn")}
                aria-label={t("mascots.downloadRawBtn")}
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noreferrer"
              >
                <DownloadSimple size={13} weight="bold" />
                <span className="style-anchor-action-badge">RAW</span>
              </a>
            )}
            <a
              href={imageUrl}
              download={`${sanitizedMascotName}_${sanitizedStyleName}_cutout.png`}
              className="style-anchor-action-btn"
              title={t("mascots.downloadCutoutBtn")}
              aria-label={t("mascots.downloadCutoutBtn")}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noreferrer"
            >
              <DownloadSimple size={13} weight="bold" />
              <span className="style-anchor-action-badge">PNG</span>
            </a>
            <button
              type="button"
              className="style-anchor-action-btn style-anchor-zoom-btn"
              title={t("mascots.zoomPreviewBtn")}
              aria-label={t("mascots.zoomPreviewBtn")}
              onClick={(e) => {
                e.stopPropagation();
                onOpenLightbox?.(imageUrl);
              }}
            >
              <MagnifyingGlassPlus size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`style-anchor-empty-placeholder ${!isBusy ? "is-clickable" : "is-busy"}`}
          onClick={() => !isBusy && onGenerate()}
          role="button"
          tabIndex={isBusy ? -1 : 0}
          aria-disabled={isBusy}
          title={!isBusy ? t("mascots.styleAnchorGeneratePrompt") : undefined}
          onKeyDown={(e) => !isBusy && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onGenerate())}
        >
          <Sparkle size={24} className="style-anchor-empty-icon" />
          <span className="style-anchor-empty-text">{t("mascots.styleAnchorMissingBadge")}</span>
          <span className="style-anchor-empty-subtext">
            {!isBusy ? t("mascots.styleAnchorGeneratePrompt") : t("mascots.generatingConceptBtn")}
          </span>
        </div>
      )}
    </div>
  );
}
