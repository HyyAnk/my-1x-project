import { CircleNotch, PaintBrush } from "@phosphor-icons/react";
import {
  ALL_MASCOT_ACTIONS,
  QUIZ_IMAGE_STYLE_LABELS,
  type MascotActionType,
  type MascotProfile,
  type QuizImageStyle,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { CORE_GAMEPLAY_ACTIONS, getLocalizedActionMeta } from "../constants";

export interface ActionsSidebarProps {
  editingMascot: MascotProfile | null;
  genName: string;
  genStyle: QuizImageStyle;
  genColor: string;
  busyAction: string | null;
  generationElapsed: number;
  batchState: {
    currentIndex: number;
    total: number;
    currentAction: MascotActionType | null;
    queue: MascotActionType[];
  } | null;
  itemProgress: number;
  overallProgress: number;
  currentStageMessage: string;
  onBatchGenerateSprites: () => void;
  onBatchGenerateCoreSprites: () => void;
  onRemoveBackground: (target: "master" | "all" | MascotActionType) => void;
  onOpenLightbox: (img: string) => void;
}

export function ActionsSidebar({
  editingMascot,
  genName,
  genStyle,
  genColor,
  busyAction,
  generationElapsed,
  batchState,
  itemProgress,
  overallProgress,
  currentStageMessage,
  onBatchGenerateSprites,
  onBatchGenerateCoreSprites,
  onRemoveBackground,
  onOpenLightbox,
}: ActionsSidebarProps) {
  const { t } = useTranslation();

  const coreReadyCount = CORE_GAMEPLAY_ACTIONS.filter((act) => Boolean(editingMascot?.actions[act]?.sprite_url)).length;
  const isCoreReady = coreReadyCount === CORE_GAMEPLAY_ACTIONS.length;
  const readyCount = ALL_MASCOT_ACTIONS.filter((act) => Boolean(editingMascot?.actions[act]?.sprite_url)).length;
  const pct = Math.round((readyCount / ALL_MASCOT_ACTIONS.length) * 100);

  return (
    <aside className="states-master-sidebar">
      <div className="states-master-capsule">
        <div className="states-master-header">
          <div
            className="states-master-avatar-wrap"
            style={{ borderColor: genColor, cursor: editingMascot?.master_image_url ? "pointer" : "default" }}
            onClick={() => {
              if (editingMascot?.master_image_url) onOpenLightbox(editingMascot.master_image_url);
            }}
            title={t("mascots.zoomPreviewBtn")}
          >
            {editingMascot?.master_image_url ? (
              <img src={editingMascot.master_image_url} alt={editingMascot.name} />
            ) : (
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: `${genColor}20` }} />
            )}
          </div>
          <div className="states-master-info">
            <h3>{editingMascot?.name || genName || t("mascots.unnamedMascot")}</h3>
            <span className="states-master-style-pill">{QUIZ_IMAGE_STYLE_LABELS[editingMascot?.visual_style || genStyle]}</span>
          </div>
        </div>

        {busyAction === "batch" || busyAction === "batch-core" ? (
          <div className="states-batch-active-box">
            <div className="states-batch-header">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <CircleNotch className="spin" size={14} style={{ color: "var(--accent)" }} />
                {busyAction === "batch-core" ? t("mascots.globalGenTitleBatchCore") : t("mascots.batchGeneratingBtn")}
              </span>
              <span style={{ fontFamily: "monospace", color: "var(--accent)" }}>{overallProgress}%</span>
            </div>

            <div className="mascot-gen-bar-track" style={{ height: "6px" }}>
              <div className="mascot-gen-bar-fill" style={{ width: `${overallProgress}%` }} />
            </div>

            {batchState?.currentAction ? (
              <div className="states-batch-active-item">
                <span>
                  {t("mascots.batchCurrentState", {
                    current: (batchState.currentIndex || 0) + 1,
                    total: batchState.total || 2,
                    action: getLocalizedActionMeta(batchState.currentAction, t).label.split(" ")[0],
                  })}
                </span>
              </div>
            ) : null}

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--muted)" }}>
              <span>{t("mascots.batchItemRendering", { percent: itemProgress })}</span>
              <span style={{ fontFamily: "monospace", color: "#38bdf8" }}>⏱ {Math.floor(generationElapsed)}s</span>
            </div>
            <div className="states-batch-sub-track">
              <div className="mascot-gen-bar-fill" style={{ width: `${itemProgress}%`, height: "100%" }} />
            </div>
          </div>
        ) : busyAction === "matting-all" ? (
          <div className="states-batch-active-box">
            <div className="states-batch-header">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <CircleNotch className="spin" size={14} style={{ color: "#a855f7" }} />
                {t("mascots.globalGenTitleMattingAll", { total: ALL_MASCOT_ACTIONS.length })}
              </span>
              <span style={{ fontFamily: "monospace", color: "#c084fc" }}>{itemProgress}%</span>
            </div>
            <div className="mascot-gen-bar-track" style={{ height: "6px" }}>
              <div className="mascot-gen-bar-fill" style={{ width: `${itemProgress}%`, backgroundColor: "#a855f7" }} />
            </div>
            <small style={{ color: "#c084fc", fontSize: "11px" }}>{currentStageMessage}</small>
          </div>
        ) : (
          <>
            <div className={`states-core-readiness ${isCoreReady ? "is-ready" : ""}`}>
              <span>{isCoreReady ? t("mascots.coreReadyStatus") : t("mascots.coreNotReadyStatus", { ready: coreReadyCount })}</span>
            </div>

            <div className="states-progress-box">
              <div className="states-progress-label">
                <span>{t("mascots.progressLabel")}</span>
                <span style={{ color: "var(--accent)" }}>
                  {readyCount}/7 ({pct}%)
                </span>
              </div>
              <div className="states-progress-track">
                <div className="states-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </>
        )}

        <div className="states-sidebar-actions">
          <button
            type="button"
            className="primary-button"
            style={{ justifyContent: "center", width: "100%" }}
            disabled={busyAction !== null}
            onClick={onBatchGenerateCoreSprites}
          >
            {busyAction === "batch-core" ? <CircleNotch className="spin" size={16} /> : null}
            <span>{busyAction === "batch-core" ? t("mascots.batchGeneratingCoreBtn") : t("mascots.batchGenerateCoreBtn")}</span>
          </button>

          <button
            type="button"
            className="secondary-button compact"
            style={{ justifyContent: "center", width: "100%" }}
            disabled={busyAction !== null}
            onClick={onBatchGenerateSprites}
          >
            {busyAction === "batch" ? <CircleNotch className="spin" size={14} /> : null}
            <span>{busyAction === "batch" ? t("mascots.batchGeneratingBtn") : t("mascots.batchGenerateBtn")}</span>
          </button>

          {ALL_MASCOT_ACTIONS.some((act) => Boolean(editingMascot?.actions[act]?.sprite_url)) ? (
            <button
              type="button"
              className="quiet-button compact"
              style={{ justifyContent: "center", width: "100%" }}
              disabled={busyAction !== null}
              onClick={() => onRemoveBackground("all")}
              title={t("mascots.batchMattingTooltip")}
            >
              {busyAction === "matting-all" ? <CircleNotch className="spin" size={14} /> : <PaintBrush size={14} />}
              <span>{busyAction === "matting-all" ? t("mascots.mattingInProgress") : t("mascots.batchMattingBtn")}</span>
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
