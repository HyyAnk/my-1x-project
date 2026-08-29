import { CircleNotch, Eye, MagicWand, PaintBrush, PencilSimple, Plus, Upload } from "@phosphor-icons/react";
import type { MascotActionType, MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta } from "../constants";

export interface ActionCardProps {
  action: MascotActionType;
  isCore?: boolean;
  editingMascot: MascotProfile | null;
  busyAction: string | null;
  batchState: {
    currentIndex: number;
    total: number;
    currentAction: MascotActionType | null;
    queue: MascotActionType[];
  } | null;
  dragOverAction: MascotActionType | null;
  setDragOverAction: (action: MascotActionType | null) => void;
  setPromptEditAction: (action: MascotActionType | null) => void;
  currentStageMessage: string;
  generationElapsed: number;
  itemProgress: number;
  onGenerateSprite: (action: MascotActionType) => void;
  onUploadSprite: (action: MascotActionType, file: File) => void;
  onDropSprite: (action: MascotActionType, e: React.DragEvent) => void;
  onRemoveBackground: (target: "master" | "all" | MascotActionType) => void;
  onSelectPreviewAction: (action: MascotActionType) => void;
  onNextStep: () => void;
}

export function ActionCard({
  action,
  isCore = false,
  editingMascot,
  busyAction,
  batchState,
  dragOverAction,
  setDragOverAction,
  setPromptEditAction,
  currentStageMessage,
  generationElapsed,
  itemProgress,
  onGenerateSprite,
  onUploadSprite,
  onDropSprite,
  onRemoveBackground,
  onSelectPreviewAction,
  onNextStep,
}: ActionCardProps) {
  const { t } = useTranslation();
  const meta = getLocalizedActionMeta(action, t);
  const sprite = editingMascot?.actions[action];
  const isActivelyGenerating = busyAction === action || Boolean(batchState && batchState.currentAction === action);
  const isQueued = Boolean(batchState && batchState.queue?.includes(action) && batchState.currentAction !== action);
  const isMatting = busyAction === `matting-${action}` || (busyAction === "matting-all" && Boolean(sprite?.sprite_url));
  const isDragOver = dragOverAction === action;
  const hasSprite = Boolean(sprite?.sprite_url);

  return (
    <div
      key={action}
      className={`artistic-state-card ${isCore ? "is-core-card" : ""} ${hasSprite ? "is-ready" : "is-missing"} ${isDragOver ? "is-dragover" : ""} ${isActivelyGenerating ? "is-generating" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOverAction(action);
      }}
      onDragLeave={() => setDragOverAction(null)}
      onDrop={(e) => onDropSprite(action, e)}
    >
      <div className="artistic-card-header">
        <div className="artistic-header-title">
          <h4 title={meta.label}>{meta.label.split(" ")[0]}</h4>
        </div>
        <span className={`artistic-motion-pill ${hasSprite ? "is-active" : ""}`}>
          {isActivelyGenerating
            ? t("mascots.currentRenderingBadge")
            : isQueued
              ? t("mascots.queuedBadge")
              : sprite?.motion_preset || meta.label.split(" ")[0]}
        </span>
      </div>

      <div className="artistic-card-canvas">
        {/* 1. Actively Generating Overlay */}
        {isActivelyGenerating ? (
          <div className="card-generating-overlay">
            <strong className="card-gen-label">{t("mascots.generatingPose", { action: meta.label.split(" ")[0] })}</strong>
            <small className="card-gen-stage">{currentStageMessage}</small>
            <div className="card-gen-bar-wrap">
              <div className="mascot-gen-bar-fill" style={{ width: `${itemProgress}%` }} />
            </div>
            <div className="card-gen-footer-meta">
              <span>⏱ {Math.floor(generationElapsed)}s</span>
              <span style={{ color: "#38bdf8" }}>{itemProgress}%</span>
            </div>
          </div>
        ) : isQueued ? (
          /* 2. Queued in Batch Overlay */
          <div className="card-queued-overlay">
            <span className="card-queued-badge">
              <CircleNotch className="spin" size={12} />
              {t("mascots.queuedBadge")}
            </span>
          </div>
        ) : isMatting ? (
          /* 3. Matting Overlay */
          <div className="matting-active-overlay">
            <CircleNotch className="spin" size={20} color="#a855f7" />
            <strong style={{ color: "#fff", fontSize: "11px" }}>{t("mascots.mattingInProgress")}</strong>
            <div className="card-gen-bar-wrap" style={{ width: "80%" }}>
              <div className="mascot-gen-bar-fill" style={{ width: `${itemProgress}%`, backgroundColor: "#a855f7" }} />
            </div>
          </div>
        ) : null}

        {/* Regular Image or Empty Dropzone */}
        {sprite?.sprite_url ? (
          <>
            <img
              src={sprite.sprite_url}
              alt={action}
              className={`artistic-mascot-img motion-${sprite.motion_preset || "breathe"}`}
              style={
                {
                  "--anim-speed": sprite.motion_speed || 1.0,
                  "--anim-intensity": sprite.motion_intensity === "subtle" ? 0.35 : sprite.motion_intensity === "dynamic" ? 2.2 : 1.0,
                } as React.CSSProperties
              }
            />
            <div className="artistic-hover-actions">
              <button
                type="button"
                className="artistic-action-btn is-primary"
                disabled={busyAction !== null}
                onClick={() => onGenerateSprite(action)}
                title={t("mascots.reGenerateBtn")}
              >
                <MagicWand size={14} weight="bold" />
              </button>

              <label className="artistic-action-btn" title={t("mascots.uploadStripBtn")} style={{ margin: 0 }}>
                <Upload size={14} />
                <input
                  type="file"
                  accept="image/png,image/webp,image/jpeg"
                  style={{ display: "none" }}
                  disabled={busyAction !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadSprite(action, file);
                  }}
                />
              </label>

              <button
                type="button"
                className="artistic-action-btn"
                disabled={busyAction !== null}
                onClick={() => onRemoveBackground(action)}
                title={t("mascots.mattingSpriteBtn")}
              >
                <PaintBrush size={14} />
              </button>

              <button
                type="button"
                className="artistic-action-btn"
                onClick={() => {
                  onSelectPreviewAction(action);
                  onNextStep();
                }}
                title={t("mascots.previewStep3Btn")}
              >
                <Eye size={14} />
              </button>

              <button
                type="button"
                className="artistic-action-btn"
                onClick={() => setPromptEditAction(action)}
                title={t("mascots.customPromptTooltip")}
              >
                <PencilSimple size={14} />
              </button>
            </div>
          </>
        ) : (
          <div
            className="artistic-empty-dropzone"
            onClick={() => {
              if (busyAction === null) onGenerateSprite(action);
            }}
          >
            <div className="artistic-empty-icon">
              <Plus size={14} weight="bold" />
            </div>
            <p className="artistic-empty-text">{t("mascots.addPoseBtn")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
