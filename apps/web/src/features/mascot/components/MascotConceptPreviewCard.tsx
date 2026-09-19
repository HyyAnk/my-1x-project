import { useMemo } from "react";
import { CircleNotch, DownloadSimple, MagnifyingGlassPlus, PaintBrush, UploadSimple } from "@phosphor-icons/react";
import { QUIZ_IMAGE_STYLE_LABELS, type MascotProfile, type QuizImageStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface MascotConceptPreviewCardProps {
  editingMascot: MascotProfile | null;
  genColor: string;
  genStyle: QuizImageStyle;
  busyAction: string | null;
  itemProgress: number;
  currentStageMessage: string;
  generationElapsed: number;
  onZoomPreview: (imgUrl: string) => void;
  onRemoveBackground: (target: "master" | "all") => void;
}

export function MascotConceptPreviewCard({
  editingMascot,
  genColor,
  genStyle,
  busyAction,
  itemProgress,
  currentStageMessage,
  generationElapsed,
  onZoomPreview,
  onRemoveBackground,
}: MascotConceptPreviewCardProps) {
  const { t } = useTranslation();

  const masterRawUrl = useMemo(() => {
    return (
      editingMascot?.master_raw_image_url ||
      (editingMascot?.master_image_url?.includes("master_concept_")
        ? editingMascot.master_image_url.replace("master_concept_", "master_concept_raw_")
        : null)
    );
  }, [editingMascot?.master_raw_image_url, editingMascot?.master_image_url]);

  const sanitizedName = useMemo(() => {
    return (editingMascot?.name || "mascot").toLowerCase().replace(/[^a-z0-9]/g, "_");
  }, [editingMascot?.name]);

  return (
    <div className="wizard-card preview-card studio-preview-card">
      <div className="wizard-card-header-flex">
        <div>
          <h3>{t("mascots.masterPreviewTitle")}</h3>
          {editingMascot?.concept_origin === "user_uploaded" ? (
            <span
              className="uploaded-origin-badge"
              data-testid="uploaded-origin-badge"
              style={{ marginTop: "6px" }}
            >
              <UploadSimple size={12} weight="bold" />
              {t("mascots.uploadedOriginBadge")}
            </span>
          ) : null}
        </div>
        {editingMascot?.master_image_url && !busyAction ? (
          <button
            type="button"
            className="icon-button compact"
            onClick={() => onZoomPreview(editingMascot.master_image_url!)}
            title={t("mascots.zoomPreviewBtn")}
          >
            <MagnifyingGlassPlus size={16} />
          </button>
        ) : null}
      </div>

      <div
        className="concept-preview-frame studio-stage-frame"
        style={{
          borderColor: busyAction === "concept" ? "var(--accent)" : editingMascot?.master_image_url ? `${genColor}80` : undefined,
          boxShadow:
            busyAction === "concept"
              ? `0 0 20px var(--accent-glow)`
              : editingMascot?.master_image_url
                ? `0 8px 24px rgba(0, 0, 0, 0.25)`
                : "var(--shadow-sm)",
        }}
      >
        {busyAction === "concept" ? (
          <div className="concept-generating-overlay">
            <div className="concept-gen-info-box">
              <div className="concept-gen-header-row">
                <span className="concept-gen-headline">
                  <CircleNotch className="spin" size={14} />
                  {t("mascots.globalGenTitleConcept")}
                </span>
                <span className="concept-gen-percent-badge">{itemProgress}%</span>
              </div>

              <div className="concept-gen-track">
                <div className="mascot-gen-bar-fill" style={{ width: `${itemProgress}%` }} />
              </div>

              <p className="concept-gen-stage-label">{currentStageMessage}</p>

              <div className="concept-gen-footer-row">
                <span>⏱ {t("mascots.elapsedTimer", { seconds: Math.floor(generationElapsed) })}</span>
                <span>{QUIZ_IMAGE_STYLE_LABELS[genStyle]}</span>
              </div>
            </div>
          </div>
        ) : busyAction === "matting-master" ? (
          <div className="matting-active-overlay">
            <CircleNotch className="spin" size={28} color="#a855f7" />
            <h4 style={{ color: "#fff", margin: 0, fontSize: "13px" }}>{t("mascots.mattingInProgress")}</h4>
            <div className="concept-gen-track" style={{ width: "80%" }}>
              <div className="mascot-gen-bar-fill" style={{ width: `${itemProgress}%`, backgroundColor: "#a855f7" }} />
            </div>
          </div>
        ) : editingMascot?.master_image_url ? (
          <div className="concept-preview-img-container" onClick={() => onZoomPreview(editingMascot.master_image_url!)}>
            <img src={editingMascot.master_image_url} alt="Master Concept" className="concept-preview-img" />
            <div className="preview-hover-overlay">
              <MagnifyingGlassPlus size={24} color="#fff" />
              <span>{t("mascots.zoomPreviewBtn")}</span>
            </div>
          </div>
        ) : (
          <div className="concept-preview-placeholder studio-placeholder">
            <p>{t("mascots.masterPreviewPlaceholder")}</p>
          </div>
        )}
      </div>

      {editingMascot?.master_image_url && !busyAction ? (
        <>
          <div className="concept-meta-box modern-meta-box">
            <div className="concept-meta-item">
              <span>{t("common.status")}:</span>
              <strong style={{ color: "var(--green)" }}>{t("mascots.statusIdentityLocked")}</strong>
            </div>
            {editingMascot.concept_origin === "user_uploaded" ? (
              <div className="concept-meta-item" data-testid="meta-concept-origin">
                <span>{t("mascots.originLabel")}:</span>
                <span className="uploaded-origin-badge">
                  <UploadSimple size={12} weight="bold" />
                  {t("mascots.uploadedOriginBadge")}
                </span>
              </div>
            ) : null}
            <div className="concept-meta-item">
              <span>{t("mascots.statusStyle")}</span>
              <strong>{QUIZ_IMAGE_STYLE_LABELS[editingMascot.visual_style]}</strong>
            </div>
          </div>

          <div className="master-action-buttons-row" style={{ marginTop: "14px", display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="quiet-button compact"
              disabled={busyAction !== null}
              onClick={() => onRemoveBackground("master")}
              style={{ flex: 1, justifyContent: "center" }}
              title={t("mascots.mattingMasterBtn")}
              data-testid="matting-master-btn"
            >
              {busyAction === "matting-master" ? <CircleNotch className="spin" size={14} /> : <PaintBrush size={14} />}
              <span>{busyAction === "matting-master" ? t("mascots.mattingInProgress") : t("mascots.mattingMasterBtn")}</span>
            </button>

            {masterRawUrl ? (
              <a
                href={masterRawUrl}
                download={`${sanitizedName}_master_raw.png`}
                className="icon-button"
                title={t("mascots.downloadRawBtn")}
                aria-label={t("mascots.downloadRawBtn")}
                data-testid="download-raw-btn"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                  gap: "2px",
                  padding: "0 6px",
                }}
              >
                <DownloadSimple size={14} weight="bold" />
                <span style={{ fontSize: "9px", fontWeight: 700 }}>RAW</span>
              </a>
            ) : null}

            <a
              href={editingMascot.master_image_url}
              download={`${sanitizedName}_master_cutout.png`}
              className="icon-button"
              title={t("mascots.downloadCutoutBtn")}
              aria-label={t("mascots.downloadCutoutBtn")}
              data-testid="download-cutout-btn"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                gap: "2px",
                padding: "0 6px",
              }}
            >
              <DownloadSimple size={14} weight="bold" />
              <span style={{ fontSize: "9px", fontWeight: 700 }}>PNG</span>
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}
