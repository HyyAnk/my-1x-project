import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Trash,
  Lightning,
  Check,
  CircleNotch,
  Sparkle,
  PaintBrush,
  Stop,
} from "@phosphor-icons/react";
import {
  type MascotProfile,
  type MascotStyle,
  getMascotStyleReadiness,
  synthesizeLegacyCoreStyle,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import { VariantSlotCard } from "./VariantSlotCard";
import { SlotPromptModal } from "./SlotPromptModal";
import { StyleAnchorReferencePin } from "./StyleAnchorReferencePin";

export type MascotActionsStepProps = {
  editingMascot: MascotProfile | null;
  stylesState: ReturnType<typeof useMascotStyles>;
  onBackStep: () => void;
  onNextStep: () => void;
  onOpenLightbox?: (img: string) => void;
};

const SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function MascotActionsStep({
  editingMascot,
  stylesState,
  onBackStep,
  onNextStep,
  onOpenLightbox,
}: MascotActionsStepProps) {
  const { t } = useTranslation();

  const {
    activeStyleId,
    setActiveStyleId,
    activeStyle,
    handleUpdateStyleKeyword,
    handleDeleteStyle,
    busySlotKey,
    handleGenerateSlot,
    handleBatchGenerateStyle,
    batchProgress,
    handleStopBatchGeneration,
    editingSlot,
    handleOpenSlotPromptModal,
    handleCloseSlotPromptModal,
    handleSaveSlotPrompt,
  } = stylesState;

  // Local state for the editable active style keyword
  const [keywordInput, setKeywordInput] = useState<string>(activeStyle?.keyword || "");
  const [isSavingKeyword, setIsSavingKeyword] = useState<boolean>(false);

  useEffect(() => {
    setKeywordInput(activeStyle?.keyword || "");
  }, [activeStyle?.id, activeStyle?.keyword]);

  // Compute all available styles, ensuring Core Style exists
  const allStyles: MascotStyle[] = useMemo(() => {
    const rawStyles = editingMascot?.styles && editingMascot.styles.length > 0
      ? [...editingMascot.styles]
      : [];

    const hasCore = rawStyles.some((s) => s.id === "core" || s.is_default);
    if (!hasCore) {
      rawStyles.unshift(synthesizeLegacyCoreStyle(editingMascot || {}));
    }
    return rawStyles;
  }, [editingMascot]);

  // Current active style fallback
  const resolvedActiveStyle = useMemo(() => {
    if (activeStyle) return activeStyle;
    return allStyles.find((s) => s.id === activeStyleId) || allStyles[0];
  }, [activeStyle, allStyles, activeStyleId]);

  // Completion calculation for active style
  const thinkingVariants = resolvedActiveStyle?.states?.thinking || [];
  const celebrateVariants = resolvedActiveStyle?.states?.celebrate || [];

  const thinkingFilledCount = thinkingVariants.filter((v) => Boolean(v.image_url)).length;
  const celebrateFilledCount = celebrateVariants.filter((v) => Boolean(v.image_url)).length;
  const totalFilledCount = thinkingFilledCount + celebrateFilledCount;
  const totalSlots = 20;

  const isCoreStyle = resolvedActiveStyle?.id === "core" || Boolean(resolvedActiveStyle?.is_default);
  const isBatchBusy = batchProgress !== null || busySlotKey === "batch";

  const handleSaveKeyword = async () => {
    if (!resolvedActiveStyle) return;
    setIsSavingKeyword(true);
    try {
      await handleUpdateStyleKeyword(resolvedActiveStyle.id, keywordInput.trim());
    } finally {
      setIsSavingKeyword(false);
    }
  };

  const handleDeleteActiveStyle = async () => {
    if (isCoreStyle || !resolvedActiveStyle) return;
    const confirmed = window.confirm(t("mascots.deleteStyleConfirm"));
    if (confirmed) {
      await handleDeleteStyle(resolvedActiveStyle.id);
    }
  };

  const getSlotBusyState = (state: "thinking" | "celebrate", slotIndex: number) => {
    const slotKey = `${state}_${slotIndex}`;
    if (busySlotKey === slotKey) return true;
    if (batchProgress) {
      return batchProgress.activeSlotKeys.includes(slotKey);
    }
    if (busySlotKey === "batch") {
      const existing = (state === "thinking" ? thinkingVariants : celebrateVariants).find(
        (v) => v.slot_index === slotIndex,
      );
      return !existing?.image_url;
    }
    return false;
  };

  const getSlotStatusText = (state: "thinking" | "celebrate", slotIndex: number) => {
    const slotKey = `${state}_${slotIndex}`;
    if (busySlotKey === slotKey) return "Generating pose...";
    if (batchProgress && batchProgress.activeSlotKeys.includes(slotKey)) {
      const streamIdx = batchProgress.activeSlotKeys.indexOf(slotKey) + 1;
      return `Stream ${streamIdx} generating...`;
    }
    return "Generating...";
  };

  return (
    <div className="wizard-step-content mascot-actions-step-container">
      <div className="wizard-card states-studio-card">
        {/* Step Header */}
        <div className="wizard-card-header-flex">
          <div>
            <span className="states-studio-badge">
              <Sparkle size={13} weight="fill" />
              <span>Step 2: Expressive States &amp; Multi-Style Studio</span>
            </span>
            <h3 className="states-studio-main-heading">Mascot Styles &amp; Expressive Poses</h3>
            <p className="states-studio-subheading">
              Manage wardrobe themes and generate up to 10 Thinking and 10 Celebrate pose variants per style.
            </p>
          </div>
        </div>

        {/* 1. STYLE TABS & MANAGEMENT */}
        <div className="mascot-style-tabs-container">
          <div className="mascot-style-tabs-scroll" role="tablist" aria-label="Mascot Styles">
            {allStyles.map((style) => {
              const isSelected = style.id === resolvedActiveStyle?.id;
              const count =
                (style.states?.thinking?.filter((v) => Boolean(v.image_url)).length || 0) +
                (style.states?.celebrate?.filter((v) => Boolean(v.image_url)).length || 0);
              const isCore = style.id === "core" || Boolean(style.is_default);
              const effectiveAnchor = style.anchor_image_url || (isCore ? editingMascot?.master_image_url : null);
              const readiness = getMascotStyleReadiness({ ...style, anchor_image_url: effectiveAnchor || undefined });

              return (
                <button
                  key={style.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`mascot-style-tab ${isSelected ? "is-active" : ""} is-readiness-${readiness}`}
                  onClick={() => setActiveStyleId(style.id)}
                >
                  <PaintBrush size={14} weight={isSelected ? "fill" : "regular"} />
                  <span className="style-tab-title">
                    {style.is_default || style.id === "core" ? "Core Style (Default)" : style.name}
                  </span>
                  <span className={`style-tab-count-pill is-readiness-${readiness}`}>{count}/20</span>
                </button>
              );
            })}

            <button
              type="button"
              className="mascot-style-tab-manage"
              onClick={onBackStep}
              disabled={isBatchBusy || busySlotKey !== null}
              title={t("mascots.manageStylesInConceptTooltip")}
            >
              <Sparkle size={13} weight="fill" />
              <span>{t("mascots.manageStylesInConcept")}</span>
            </button>
          </div>
        </div>

        {/* 2. ACTIVE STYLE BANNER & CONTROLS */}
        <div className="active-style-banner">
          <div className="active-style-banner-top">
            <div className="active-style-info-col">
              <div className="active-style-title-row">
                <h4 className="active-style-name">
                  {resolvedActiveStyle?.is_default || resolvedActiveStyle?.id === "core"
                    ? "Core Style (Default)"
                    : resolvedActiveStyle?.name}
                </h4>
                <span className={`style-type-badge ${isCoreStyle ? "is-core" : "is-custom"}`}>
                  {isCoreStyle ? "Default Style" : "Custom Style"}
                </span>
                <span className="style-completion-badge">
                  {totalFilledCount}/{totalSlots} slots generated
                </span>
              </div>
              <p className="active-style-description">
                {isCoreStyle
                  ? "Default mascot visual identity and signature wardrobe."
                  : "Custom wardrobe and thematic styling for this character."}
              </p>
            </div>

            <div className="active-style-actions-col">
              <button
                type="button"
                className="primary-button is-batch-generate"
                onClick={() => handleBatchGenerateStyle("all")}
                disabled={isBatchBusy || busySlotKey !== null}
                title="Generate all empty slots in this style"
              >
                {isBatchBusy ? (
                  <>
                    <CircleNotch size={15} className="spin" />
                    <span>Generating All Slots...</span>
                  </>
                ) : (
                  <>
                    <Lightning size={15} weight="fill" />
                    <span>Generate Full Style</span>
                  </>
                )}
              </button>

              {!isCoreStyle ? (
                <button
                  type="button"
                  className="quiet-button is-delete-style"
                  onClick={handleDeleteActiveStyle}
                  disabled={busySlotKey !== null}
                  title="Delete this custom style"
                  aria-label="Delete style"
                >
                  <Trash size={15} />
                  <span>Delete Style</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Style Keyword Input Row */}
          <div className="active-style-keyword-box">
            <div className="keyword-input-wrap">
              <label htmlFor="active-style-keyword-input" className="keyword-field-label">
                Style Theme Keyword:
              </label>
              <input
                id="active-style-keyword-input"
                type="text"
                className="style-keyword-input"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="e.g., tactical military camouflage uniform, beret, tactical gear"
                disabled={busySlotKey !== null || isSavingKeyword}
              />
            </div>
            <button
              type="button"
              className="save-keyword-btn"
              onClick={handleSaveKeyword}
              disabled={
                keywordInput === (resolvedActiveStyle?.keyword || "") ||
                isSavingKeyword ||
                busySlotKey !== null
              }
              title="Save keyword updates"
            >
              {isSavingKeyword ? (
                <CircleNotch size={14} className="spin" />
              ) : (
                <Check size={14} weight="bold" />
              )}
              <span>Save Keyword</span>
            </button>
          </div>
        </div>

        {/* Style Visual Anchor Reference Pin */}
        <StyleAnchorReferencePin
          style={resolvedActiveStyle}
          editingMascot={editingMascot}
          stylesState={stylesState}
          onOpenLightbox={onOpenLightbox}
        />

        {/* LIVE BATCH GENERATION PROGRESS DECK (3 CONCURRENT STREAMS) */}
        {batchProgress ? (
          <div
            className="batch-progress-deck"
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round((batchProgress.completed / batchProgress.total) * 100))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Batch Generation Progress"
          >
            <div className="batch-progress-header">
              <div className="batch-progress-meta">
                <div className="batch-progress-title-row">
                  <Lightning size={17} weight="fill" className="batch-pulse-icon" />
                  <span className="batch-progress-title">
                    Generating Style Variants (3 Concurrent Streams)
                  </span>
                </div>
                <span className="batch-progress-counter">
                  {batchProgress.completed} / {batchProgress.total} slots ({Math.min(100, Math.round((batchProgress.completed / batchProgress.total) * 100))}%)
                  {batchProgress.failed > 0 ? ` • ${batchProgress.failed} failed` : ""}
                </span>
              </div>

              <button
                type="button"
                className="batch-stop-button"
                onClick={handleStopBatchGeneration}
                disabled={batchProgress.isStopping}
                title="Cancel the remaining server-side slot generation"
              >
                <Stop size={14} weight="fill" />
                <span>{batchProgress.isStopping ? "Stopping Queue..." : "Stop Generation"}</span>
              </button>
            </div>

            {/* Progress Bar Track */}
            <div className="batch-progress-track">
              <div
                className="batch-progress-fill"
                style={{
                  width: `${Math.min(100, Math.round((batchProgress.completed / batchProgress.total) * 100))}%`,
                }}
              />
            </div>

            {/* Status Message and Active Worker Badges */}
            <div className="batch-progress-footer">
              <div className="batch-live-status-message">
                <CircleNotch size={14} className="spin" />
                <span>{batchProgress.statusMessage}</span>
              </div>

              {batchProgress.activeSlotKeys.length > 0 ? (
                <div className="active-streams-pills">
                  <span className="active-streams-label">Active Streams:</span>
                  {batchProgress.activeSlotKeys.map((key, idx) => {
                    const [st, num] = key.split("_");
                    return (
                      <span key={key} className="stream-badge">
                        <span className="stream-dot" />
                        Stream {idx + 1}: {st === "thinking" ? "Thinking" : "Celebrate"} #{num}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* 3. TWO STATE SECTIONS WITH 10 SLOTS EACH */}
        <div className="variant-states-container">
          {/* Section A: Thinking (10 Slots) */}
          <section className="variant-state-section" aria-labelledby="thinking-section-heading">
            <div className="variant-state-header">
              <div className="state-header-text">
                <div className="state-title-wrap">
                  <h4 id="thinking-section-heading">Thinking</h4>
                  <span className="state-counter-pill">{thinkingFilledCount}/10</span>
                </div>
                <p className="state-subtitle">
                  Pondering, chin resting, clue inspection, countdown poses.
                </p>
              </div>

              <div className="state-header-actions">
                <button
                  type="button"
                  className="quiet-button is-quick-batch"
                  onClick={() => handleBatchGenerateStyle("thinking")}
                  disabled={isBatchBusy || busySlotKey !== null || thinkingFilledCount === 10}
                  title="Generate all empty Thinking slots"
                >
                  <Lightning size={13} weight="bold" />
                  <span>Batch Thinking ({10 - thinkingFilledCount} empty)</span>
                </button>
              </div>
            </div>

            <div className="variant-slots-grid">
              {SLOT_NUMBERS.map((slotIndex) => {
                const variant = thinkingVariants.find((v) => v.slot_index === slotIndex);
                const isBusy = getSlotBusyState("thinking", slotIndex);

                return (
                  <VariantSlotCard
                    key={`thinking-${slotIndex}`}
                    state="thinking"
                    slotIndex={slotIndex}
                    variant={variant}
                    isBusy={isBusy}
                    statusText={getSlotStatusText("thinking", slotIndex)}
                    onGenerate={(slot) => handleGenerateSlot("thinking", slot)}
                    onRegenerate={(slot) => handleGenerateSlot("thinking", slot, undefined)}
                    onEditPrompt={(slot) => handleOpenSlotPromptModal("thinking", slot)}
                    onOpenLightbox={onOpenLightbox}
                  />
                );
              })}
            </div>
          </section>

          {/* Section B: Celebrate (10 Slots) */}
          <section className="variant-state-section" aria-labelledby="celebrate-section-heading">
            <div className="variant-state-header">
              <div className="state-header-text">
                <div className="state-title-wrap">
                  <h4 id="celebrate-section-heading">Celebrate</h4>
                  <span className="state-counter-pill">{celebrateFilledCount}/10</span>
                </div>
                <p className="state-subtitle">
                  Joyful jump, triumphant arms raised, victory poses.
                </p>
              </div>

              <div className="state-header-actions">
                <button
                  type="button"
                  className="quiet-button is-quick-batch"
                  onClick={() => handleBatchGenerateStyle("celebrate")}
                  disabled={isBatchBusy || busySlotKey !== null || celebrateFilledCount === 10}
                  title="Generate all empty Celebrate slots"
                >
                  <Lightning size={13} weight="bold" />
                  <span>Batch Celebrate ({10 - celebrateFilledCount} empty)</span>
                </button>
              </div>
            </div>

            <div className="variant-slots-grid">
              {SLOT_NUMBERS.map((slotIndex) => {
                const variant = celebrateVariants.find((v) => v.slot_index === slotIndex);
                const isBusy = getSlotBusyState("celebrate", slotIndex);

                return (
                  <VariantSlotCard
                    key={`celebrate-${slotIndex}`}
                    state="celebrate"
                    slotIndex={slotIndex}
                    variant={variant}
                    isBusy={isBusy}
                    statusText={getSlotStatusText("celebrate", slotIndex)}
                    onGenerate={(slot) => handleGenerateSlot("celebrate", slot)}
                    onRegenerate={(slot) => handleGenerateSlot("celebrate", slot, undefined)}
                    onEditPrompt={(slot) => handleOpenSlotPromptModal("celebrate", slot)}
                    onOpenLightbox={onOpenLightbox}
                  />
                );
              })}
            </div>
          </section>
        </div>

        {/* Wizard Footer Navigation */}
        <div className="wizard-action-row" style={{ marginTop: "28px" }}>
          <button type="button" className="quiet-button" onClick={onBackStep}>
            <ArrowLeft size={15} />
            <span>{t("mascots.backIdentityBtn") || "Back to Identity"}</span>
          </button>
          <button type="button" className="primary-button" onClick={onNextStep}>
            <span>{t("mascots.nextAnimationBtn") || "Next: Motion Studio"}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>


      <SlotPromptModal
        isOpen={Boolean(editingSlot)}
        state={editingSlot?.state || "thinking"}
        slotIndex={editingSlot?.slotIndex || 1}
        initialPrompt={editingSlot?.currentPrompt || ""}
        styleKeyword={resolvedActiveStyle?.keyword || ""}
        styleName={resolvedActiveStyle?.name || "Active Style"}
        onClose={handleCloseSlotPromptModal}
        onSave={handleSaveSlotPrompt}
      />
    </div>
  );
}
