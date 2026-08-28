import {
  ArrowLeft,
  ArrowRight,
  Broadcast,
  CheckCircle,
  CircleNotch,
  Eye,
  Lightning,
  MagicWand,
  PaintBrush,
  PencilSimple,
  Plus,
  Rocket,
  Smiley,
  Sparkle,
  Upload,
  X,
} from "@phosphor-icons/react";
import {
  ALL_MASCOT_ACTIONS,
  QUIZ_IMAGE_STYLE_LABELS,
  type MascotActionType,
  type MascotProfile,
  type QuizImageStyle,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";
import {
  AUXILIARY_ACTIONS,
  BRAND_IDENTITY_ACTIONS,
  CORE_GAMEPLAY_ACTIONS,
  getLocalizedActionMeta,
} from "../constants";

type MascotActionsStepProps = {
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
  dragOverAction: MascotActionType | null;
  setDragOverAction: (action: MascotActionType | null) => void;
  promptEditAction: MascotActionType | null;
  setPromptEditAction: (action: MascotActionType | null) => void;
  actionPrompts: Record<MascotActionType, string>;
  setActionPrompts: React.Dispatch<React.SetStateAction<Record<MascotActionType, string>>>;
  onGenerateSprite: (action: MascotActionType) => void;
  onBatchGenerateSprites: () => void;
  onBatchGenerateCoreSprites: () => void;
  onUploadSprite: (action: MascotActionType, file: File) => void;
  onDropSprite: (action: MascotActionType, e: React.DragEvent) => void;
  onRemoveBackground: (target: "master" | "all" | MascotActionType) => void;
  onSelectPreviewAction: (action: MascotActionType) => void;
  onBackStep: () => void;
  onNextStep: () => void;
  onOpenLightbox: (img: string) => void;
};

export function MascotActionsStep({
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
  dragOverAction,
  setDragOverAction,
  promptEditAction,
  setPromptEditAction,
  actionPrompts,
  setActionPrompts,
  onGenerateSprite,
  onBatchGenerateSprites,
  onBatchGenerateCoreSprites,
  onUploadSprite,
  onDropSprite,
  onRemoveBackground,
  onSelectPreviewAction,
  onBackStep,
  onNextStep,
  onOpenLightbox,
}: MascotActionsStepProps) {
  const { t } = useTranslation();

  const renderActionCard = (action: MascotActionType, isCore: boolean = false) => {
    const meta = getLocalizedActionMeta(action, t);
    const sprite = editingMascot?.actions[action];
    const isActivelyGenerating = busyAction === action || Boolean(batchState && batchState.currentAction === action);
    const isQueued = Boolean(batchState && batchState.queue?.includes(action) && batchState.currentAction !== action);
    const isMatting = busyAction === `matting-${action}` || (busyAction === "matting-all" && Boolean(sprite?.sprite_url));
    const isUploadBusy = busyAction === `upload-${action}`;
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
            <span className="pose-icon">{meta.icon}</span>
            <h4 title={meta.label}>{meta.label.split(" ")[0]}</h4>
          </div>
          <span className={`artistic-motion-pill ${hasSprite ? "is-active" : ""}`}>
            {isActivelyGenerating ? t("mascots.currentRenderingBadge") : isQueued ? t("mascots.queuedBadge") : meta.label.split(" ")[0]}
          </span>
        </div>

        <div className="artistic-card-canvas">
          {/* 1. Actively Generating Overlay */}
          {isActivelyGenerating ? (
            <div className="card-generating-overlay">
              <div className="concept-gen-laser-scan" />
              <div className="card-gen-spinner-wrap">
                <div className="card-gen-ring" />
                <div className="card-gen-core-icon">
                  <Sparkle size={15} weight="fill" />
                </div>
              </div>
              <strong className="card-gen-label">
                {t("mascots.generatingPose", { action: meta.label.split(" ")[0] })}
              </strong>
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
              <p style={{ margin: 0, fontSize: "10.5px", color: "#94a3b8" }}>
                {t("mascots.batchCurrentState", {
                  current: (batchState?.currentIndex || 0) + 1,
                  total: batchState?.total || 7,
                  action: meta.label.split(" ")[0],
                })}
              </p>
            </div>
          ) : isMatting ? (
            /* 3. Matting Overlay */
            <div className="matting-active-overlay">
              <div className="matting-laser" />
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
                className={`artistic-mascot-img mascot-anim-${action}`}
              />
              <div className="artistic-hover-actions">
                <button
                  type="button"
                  className="artistic-action-btn is-primary"
                  disabled={busyAction !== null}
                  onClick={() => onGenerateSprite(action)}
                  title={t("mascots.reGenerateBtn")}
                >
                  <MagicWand size={15} weight="bold" />
                </button>

                <label className="artistic-action-btn" title={t("mascots.uploadStripBtn")} style={{ margin: 0 }}>
                  <Upload size={15} />
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
                  <PaintBrush size={15} />
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
                  <Eye size={15} />
                </button>

                <button
                  type="button"
                  className="artistic-action-btn"
                  onClick={() => setPromptEditAction(action)}
                  title={t("mascots.customPromptTooltip")}
                >
                  <PencilSimple size={15} />
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
                <Plus size={15} weight="bold" />
              </div>
              <p className="artistic-empty-text">
                {t("mascots.addPoseBtn")}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const coreReadyCount = CORE_GAMEPLAY_ACTIONS.filter((act) => Boolean(editingMascot?.actions[act]?.sprite_url)).length;
  const isCoreReady = coreReadyCount === CORE_GAMEPLAY_ACTIONS.length;
  const readyCount = ALL_MASCOT_ACTIONS.filter((act) => Boolean(editingMascot?.actions[act]?.sprite_url)).length;
  const pct = Math.round((readyCount / ALL_MASCOT_ACTIONS.length) * 100);

  return (
    <div className="wizard-step-content">
      <div className="wizard-card">
        <div className="wizard-card-header-flex">
          <div>
            <h3>{t("mascots.statesStudioTitle")}</h3>
            <p className="wizard-card-sub">{t("mascots.statesStudioSub")}</p>
          </div>
        </div>

        <div className="states-studio-layout">
          {/* Left Sidebar: Master Concept Anchor & Batch Hub */}
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
                    <Smiley size={26} weight="duotone" style={{ color: genColor }} />
                  )}
                </div>
                <div className="states-master-info">
                  <h3>{editingMascot?.name || genName || t("mascots.unnamedMascot")}</h3>
                  <span className="states-master-style-pill">
                    <Sparkle size={12} weight="fill" />
                    {QUIZ_IMAGE_STYLE_LABELS[editingMascot?.visual_style || genStyle]}
                  </span>
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
                      <span className="mascot-gen-pulse-dot" />
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
                    {isCoreReady ? (
                      <>
                        <CheckCircle size={14} weight="fill" />
                        <span>{t("mascots.coreReadyStatus")}</span>
                      </>
                    ) : (
                      <>
                        <Sparkle size={14} weight="fill" />
                        <span>{t("mascots.coreNotReadyStatus", { ready: coreReadyCount })}</span>
                      </>
                    )}
                  </div>

                  <div className="states-progress-box">
                    <div className="states-progress-label">
                      <span>{t("mascots.progressLabel")}</span>
                      <span style={{ color: "var(--accent)" }}>{readyCount}/7 ({pct}%)</span>
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
                  {busyAction === "batch-core" ? <CircleNotch className="spin" size={16} /> : <Lightning size={16} weight="fill" />}
                  <span>{busyAction === "batch-core" ? t("mascots.batchGeneratingCoreBtn") : t("mascots.batchGenerateCoreBtn")}</span>
                </button>

                <button
                  type="button"
                  className="secondary-button compact"
                  style={{ justifyContent: "center", width: "100%" }}
                  disabled={busyAction !== null}
                  onClick={onBatchGenerateSprites}
                >
                  {busyAction === "batch" ? <CircleNotch className="spin" size={14} /> : <Rocket size={14} />}
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

          {/* Right Column: Grouped Expressive States Sections */}
          <main className="states-groups-container">
            {/* Section 1: Core Gameplay Poses (2) */}
            <section className="states-group-section is-core-group">
              <div className="states-group-header">
                <div className="states-group-title-wrap">
                  <h4>
                    <Sparkle size={16} weight="fill" style={{ color: "#f59e0b" }} />
                    {t("mascots.coreGroupTitle")}
                  </h4>
                  <p>{t("mascots.coreGroupSub")}</p>
                </div>
                <span className="states-group-badge is-core">
                  <Lightning size={12} weight="fill" />
                  {t("mascots.coreBadge")}
                </span>
              </div>
              <div className="artistic-states-grid">
                {CORE_GAMEPLAY_ACTIONS.map((action) => renderActionCard(action, true))}
              </div>
            </section>

            {/* Section 2: Brand & Signature Poses (2) */}
            <section className="states-group-section">
              <div className="states-group-header">
                <div className="states-group-title-wrap">
                  <h4>
                    <Broadcast size={16} weight="duotone" style={{ color: "#a78bfa" }} />
                    {t("mascots.brandGroupTitle")}
                  </h4>
                  <p>{t("mascots.brandGroupSub")}</p>
                </div>
                <span className="states-group-badge is-brand">
                  {t("mascots.brandBadge")}
                </span>
              </div>
              <div className="artistic-states-grid">
                {BRAND_IDENTITY_ACTIONS.map((action) => renderActionCard(action, false))}
              </div>
            </section>

            {/* Section 3: Auxiliary Reactions (3) */}
            <section className="states-group-section">
              <div className="states-group-header">
                <div className="states-group-title-wrap">
                  <h4>
                    <Smiley size={16} weight="duotone" style={{ color: "var(--muted)" }} />
                    {t("mascots.auxGroupTitle")}
                  </h4>
                  <p>{t("mascots.auxGroupSub")}</p>
                </div>
                <span className="states-group-badge is-aux">
                  {t("mascots.auxBadge")}
                </span>
              </div>
              <div className="artistic-states-grid">
                {AUXILIARY_ACTIONS.map((action) => renderActionCard(action, false))}
              </div>
            </section>
          </main>
        </div>

        <div className="wizard-action-row" style={{ marginTop: "24px" }}>
          <button type="button" className="quiet-button" onClick={onBackStep}>
            <ArrowLeft size={15} />
            <span>{t("mascots.backIdentityBtn")}</span>
          </button>
          <button type="button" className="primary-button" onClick={onNextStep}>
            <span>{t("mascots.nextStageDeployBtn")}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* State Custom Prompt Edit Modal */}
      {promptEditAction ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setPromptEditAction(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>{getLocalizedActionMeta(promptEditAction, t).icon}</span>
                <div>
                  <p className="eyebrow">{t("mascots.customPromptEyebrow")}</p>
                  <h2>{getLocalizedActionMeta(promptEditAction, t).label}</h2>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={t("common.close")}
                onClick={() => setPromptEditAction(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ marginTop: "16px" }}>
              <div className="form-group">
                <label>{t("mascots.customPromptLabel")}</label>
                <textarea
                  className="full-prompt-textarea"
                  rows={4}
                  value={actionPrompts[promptEditAction]}
                  onChange={(e) => setActionPrompts((prev) => ({ ...prev, [promptEditAction]: e.target.value }))}
                  placeholder={getLocalizedActionMeta(promptEditAction, t).description}
                  style={{ width: "100%", fontSize: "13px", resize: "vertical" }}
                />
                <span style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  {t("mascots.customPromptSub")}
                </span>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" className="quiet-button" onClick={() => setPromptEditAction(null)}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const act = promptEditAction;
                  setPromptEditAction(null);
                  if (act) onGenerateSprite(act);
                }}
              >
                <MagicWand size={16} />
                <span>{t("mascots.saveAndRegenerateBtn")}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
