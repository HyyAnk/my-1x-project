import { useMemo } from "react";
import { PushPin, WarningCircle, CircleNotch, MagicWand, MagnifyingGlassPlus, CheckCircle } from "@phosphor-icons/react";
import { type MascotProfile, type MascotStyle, getMascotStyleReadiness } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";

export interface StyleAnchorReferencePinProps {
  style: MascotStyle | null | undefined;
  editingMascot: MascotProfile | null | undefined;
  stylesState?: ReturnType<typeof useMascotStyles>;
  onOpenLightbox?: (url: string) => void;
}

function StyleAnchorWithImage({
  style,
  effectiveAnchorImage,
  readiness,
  totalPoses,
  onOpenLightbox,
}: {
  style: MascotStyle;
  effectiveAnchorImage: string;
  readiness: ReturnType<typeof getMascotStyleReadiness>;
  totalPoses: number;
  onOpenLightbox?: (url: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="style-anchor-pin-container has-anchor" data-testid="style-anchor-pin">
      <div className="style-anchor-pin-preview">
        <div
          className="style-anchor-pin-thumb-wrap"
          onClick={() => onOpenLightbox?.(effectiveAnchorImage)}
          role="button"
          tabIndex={0}
          aria-label={t("mascots.zoomPreviewBtn") || "Zoom preview"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenLightbox?.(effectiveAnchorImage);
            }
          }}
        >
          <img src={effectiveAnchorImage} alt={style.name || "Style Anchor"} className="style-anchor-pin-thumb" loading="lazy" />
          <div className="style-anchor-pin-zoom-hint">
            <MagnifyingGlassPlus size={16} />
          </div>
        </div>
      </div>

      <div className="style-anchor-pin-info">
        <div className="style-anchor-pin-title-row">
          <span className="style-anchor-pin-title">
            <PushPin size={15} weight="fill" className="style-anchor-pin-icon" />
            <span>{t("mascots.styleAnchorPinTitle")}</span>
          </span>

          {readiness === "fully_expressive" ? (
            <span className="style-anchor-pin-badge badge-fully-expressive">
              <CheckCircle size={12} weight="fill" />
              <span>
                {t("mascots.styleAnchorPinBadgeFullyExpressive", { count: totalPoses }) || `Fully Expressive (${totalPoses}/20 Poses)`}
              </span>
            </span>
          ) : (
            <span className="style-anchor-pin-badge badge-concept-locked">
              <CheckCircle size={12} weight="fill" />
              <span>
                {t("mascots.styleAnchorPinBadgeConceptLocked", { count: totalPoses }) ||
                  `Concept Locked - Poses In Progress (${totalPoses}/20)`}
              </span>
            </span>
          )}
        </div>
        <p className="style-anchor-pin-desc">{t("mascots.styleAnchorPinDesc")}</p>
      </div>
    </div>
  );
}

function StyleAnchorMissingWarning({
  styleId,
  isBusy,
  isThisGenerating,
  onGenerate,
}: {
  styleId: string;
  isBusy: boolean;
  isThisGenerating: boolean;
  onGenerate?: (styleId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="style-anchor-pin-container is-warning" data-testid="style-anchor-pin-warning">
      <div className="style-anchor-pin-preview">
        <div className="style-anchor-pin-warning-icon">
          <WarningCircle size={22} weight="fill" />
        </div>
      </div>

      <div className="style-anchor-pin-info">
        <div className="style-anchor-pin-title-row">
          <span className="style-anchor-pin-title is-warning">
            <WarningCircle size={15} weight="fill" />
            <span>{t("mascots.styleAnchorPinMissingTitle")}</span>
          </span>
          <span className="style-anchor-pin-badge badge-warning">{t("mascots.styleAnchorMissingBadge") || "Anchor Missing"}</span>
        </div>
        <p className="style-anchor-pin-desc">{t("mascots.styleAnchorPinDesc")}</p>
      </div>

      <div className="style-anchor-pin-actions">
        <button
          type="button"
          className="primary-button is-generate-anchor"
          onClick={() => onGenerate?.(styleId)}
          disabled={isBusy}
          title={t("mascots.styleAnchorPinGenerateBtn")}
        >
          {isThisGenerating ? (
            <>
              <CircleNotch size={14} className="spin" />
              <span>{t("mascots.styleAnchorPinGeneratingBtn")}</span>
            </>
          ) : (
            <>
              <MagicWand size={14} weight="bold" />
              <span>{t("mascots.styleAnchorPinGenerateBtn")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * StyleAnchorReferencePin renders the visual ground truth anchor for the active mascot style in Step 2.
 * It ensures all expressive poses visually inherit the costume, palette, and traits without drift.
 */
export function StyleAnchorReferencePin({ style, editingMascot, stylesState, onOpenLightbox }: StyleAnchorReferencePinProps) {
  const isCore = style?.id === "core" || Boolean(style?.is_default);
  const effectiveAnchorImage = style?.anchor_image_url || (isCore ? editingMascot?.master_image_url : null);

  const effectiveStyle = useMemo(() => {
    if (!style) return null;
    return { ...style, anchor_image_url: effectiveAnchorImage || undefined };
  }, [style, effectiveAnchorImage]);

  const readiness = useMemo(() => getMascotStyleReadiness(effectiveStyle), [effectiveStyle]);
  const thinkingCount = (style?.states?.thinking || []).filter((v) => Boolean(v.image_url?.trim())).length;
  const celebrateCount = (style?.states?.celebrate || []).filter((v) => Boolean(v.image_url?.trim())).length;
  const totalPoses = thinkingCount + celebrateCount;

  const isThisGenerating = Boolean(style?.id && stylesState?.generatingConceptStyleId === style.id);
  const isAnyConceptGenerating = Boolean(stylesState?.generatingConceptStyleId);
  const isBusy = isAnyConceptGenerating || (stylesState?.busySlotKey !== null && stylesState?.busySlotKey !== undefined);

  if (!style) return null;

  if (effectiveAnchorImage) {
    return (
      <StyleAnchorWithImage
        style={style}
        effectiveAnchorImage={effectiveAnchorImage}
        readiness={readiness}
        totalPoses={totalPoses}
        onOpenLightbox={onOpenLightbox}
      />
    );
  }

  return (
    <StyleAnchorMissingWarning
      styleId={style.id}
      isBusy={isBusy}
      isThisGenerating={isThisGenerating}
      onGenerate={stylesState ? (id) => stylesState.handleGenerateStyleConcept(id) : undefined}
    />
  );
}
