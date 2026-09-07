import { useMemo } from "react";
import {
  MagicWand,
  ArrowCounterClockwise,
  Trash,
  Lock,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  MagnifyingGlassPlus,
  Sparkle,
} from "@phosphor-icons/react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";

export interface MascotStyleAnchorCardProps {
  style: MascotStyle;
  editingMascot: MascotProfile;
  stylesState?: ReturnType<typeof useMascotStyles>;
  onOpenLightbox?: (url: string) => void;
}

export function MascotStyleAnchorCard({
  style,
  editingMascot,
  stylesState,
  onOpenLightbox,
}: MascotStyleAnchorCardProps) {
  const { t } = useTranslation();
  const isCore = style.id === "core" || Boolean(style.is_default);
  const imageUrl = isCore ? (style.anchor_image_url || editingMascot.master_image_url) : style.anchor_image_url;
  const isThisGenerating = stylesState?.generatingConceptStyleId === style.id;
  const isAnyConceptGenerating = Boolean(stylesState?.generatingConceptStyleId);
  const isBusy = isAnyConceptGenerating || (stylesState?.busySlotKey !== null && stylesState?.busySlotKey !== undefined);
  const hasImage = Boolean(imageUrl);

  const keywordsList = useMemo(() => {
    if (isCore || !style.keyword) return [];
    return style.keyword
      .split(/[,\n;]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [isCore, style.keyword]);

  const filledPosesCount = useMemo(() => {
    const thinking = (style.states?.thinking || []).filter((v) => Boolean(v.image_url)).length;
    const celebrate = (style.states?.celebrate || []).filter((v) => Boolean(v.image_url)).length;
    return thinking + celebrate;
  }, [style.states]);

  return (
    <div
      className={`style-anchor-card ${isCore ? "is-core" : "is-custom"} ${hasImage ? "has-anchor" : "missing-anchor"} ${isThisGenerating ? "is-generating" : ""}`}
      data-style-id={style.id}
    >
      <div className="style-anchor-header">
        <div className="style-anchor-header-left">
          <span className="style-anchor-name">{style.name}</span>
          {keywordsList.length > 0 ? (
            <div className="style-anchor-keywords-list">
              {keywordsList.slice(0, 2).map((kw, i) => (
                <span key={i} className="style-anchor-keyword-chip" title={kw}>
                  {kw}
                </span>
              ))}
              {keywordsList.length > 2 ? (
                <span className="style-anchor-keyword-more" title={keywordsList.slice(2).join(", ")}>
                  +{keywordsList.length - 2}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="style-anchor-header-right">
          {isCore ? (
            <div className="style-anchor-badge-group">
              <span className="style-anchor-badge badge-core">{t("mascots.styleAnchorCoreBadge")}</span>
              <span className="style-anchor-badge badge-locked">
                <Lock size={12} weight="bold" />
                <span>{t("mascots.styleAnchorStatusLocked")}</span>
              </span>
            </div>
          ) : (
            <div className="style-anchor-badge-group">
              {hasImage ? (
                <span className="style-anchor-badge badge-locked">
                  <CheckCircle size={12} weight="fill" />
                  <span>{t("mascots.styleAnchorLockedBadge")}</span>
                </span>
              ) : (
                <span className="style-anchor-badge badge-missing">
                  <WarningCircle size={12} weight="fill" />
                  <span>{t("mascots.styleAnchorMissingBadge")}</span>
                </span>
              )}
              {filledPosesCount > 0 ? (
                <span className="style-anchor-badge badge-poses">
                  {t("mascots.styleAnchorPosesCount", { count: filledPosesCount })}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

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
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenLightbox?.(imageUrl);
              }
            }}
          >
            <img src={imageUrl} alt={style.name} className="style-anchor-thumb" loading="lazy" />
            <div className="style-anchor-zoom-hint"><MagnifyingGlassPlus size={16} /></div>
          </div>
        ) : (
          <div
            className={`style-anchor-empty-placeholder ${!isBusy ? "is-clickable" : "is-busy"}`}
            onClick={() => {
              if (!isBusy) {
                stylesState?.handleGenerateStyleConcept(style.id);
              }
            }}
            role="button"
            tabIndex={isBusy ? -1 : 0}
            aria-disabled={isBusy}
            title={!isBusy ? t("mascots.styleAnchorGeneratePrompt") : undefined}
            onKeyDown={(e) => {
              if (!isBusy && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                stylesState?.handleGenerateStyleConcept(style.id);
              }
            }}
          >
            <Sparkle size={24} className="style-anchor-empty-icon" />
            <span className="style-anchor-empty-text">{t("mascots.styleAnchorMissingBadge")}</span>
            <span className="style-anchor-empty-subtext">
              {!isBusy ? t("mascots.styleAnchorGeneratePrompt") : t("mascots.generatingConceptBtn")}
            </span>
          </div>
        )}
      </div>

      {isCore ? (
        <div className="style-anchor-actions is-core-actions">
          <span className="style-anchor-core-note">
            <Lock size={12} weight="bold" />
            <span>{t("mascots.styleAnchorCoreNote")}</span>
          </span>
        </div>
      ) : (
        <div className="style-anchor-actions">
          {hasImage ? (
            <button
              type="button"
              className="quiet-button compact"
              onClick={() => stylesState?.handleGenerateStyleConcept(style.id)}
              disabled={isBusy}
              title={t("mascots.rerollConceptBtn")}
            >
              {isThisGenerating ? <CircleNotch size={14} className="spin" /> : <ArrowCounterClockwise size={14} />}
              <span>{t("mascots.rerollConceptBtn")}</span>
            </button>
          ) : (
            <button
              type="button"
              className="primary-button compact"
              onClick={() => stylesState?.handleGenerateStyleConcept(style.id)}
              disabled={isBusy}
              title={t("mascots.generateStyleConceptBtn")}
            >
              {isThisGenerating ? <CircleNotch size={14} className="spin" /> : <MagicWand size={14} weight="bold" />}
              <span>{t("mascots.generateStyleConceptBtn")}</span>
            </button>
          )}

          <button
            type="button"
            className="quiet-button compact danger-icon-btn"
            onClick={() => {
              if (window.confirm(t("mascots.deleteStyleConfirm"))) {
                stylesState?.handleDeleteStyle(style.id);
              }
            }}
            disabled={isBusy}
            title={t("mascots.deleteStyleBtn")}
          >
            <Trash size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
