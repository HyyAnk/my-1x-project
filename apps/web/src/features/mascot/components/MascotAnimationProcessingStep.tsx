import { useMemo } from "react";
import { ArrowLeft, ArrowRight, FilmStrip, CheckCircle } from "@phosphor-icons/react";
import { type MascotProfile, type MascotStyle, synthesizeLegacyCoreStyle } from "@studio/shared";
import type { Notice } from "../../../components/types";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import { useMascotAnimationProcessing } from "../animation/hooks/useMascotAnimationProcessing";
import { AnimationProcessingSlotCard } from "../animation/components/AnimationProcessingSlotCard";
import { MascotStyleTabBar } from "./MascotStyleTabBar";

export interface MascotAnimationProcessingStepProps {
  editingMascot: MascotProfile | null;
  stylesState: ReturnType<typeof useMascotStyles>;
  onBackStep: () => void;
  onNextStep: () => void;
  onNotice?: (notice: Notice) => void;
}

export function MascotAnimationProcessingStep({
  editingMascot,
  stylesState,
  onBackStep,
  onNextStep,
  onNotice,
}: MascotAnimationProcessingStepProps) {
  const { activeStyleId, setActiveStyleId, activeStyle } = stylesState;

  // Compute all available styles, ensuring Core Style exists
  const allStyles: MascotStyle[] = useMemo(() => {
    const rawStyles = editingMascot?.styles && editingMascot.styles.length > 0 ? [...editingMascot.styles] : [];
    const hasCore = rawStyles.some((s) => s.id === "core" || s.is_default);
    if (!hasCore) {
      rawStyles.unshift(synthesizeLegacyCoreStyle(editingMascot || {}));
    }
    return rawStyles;
  }, [editingMascot]);

  // Resolve currently active style
  const resolvedActiveStyle = useMemo(() => {
    if (activeStyle) return activeStyle;
    return allStyles.find((s) => s.id === activeStyleId) || allStyles[0];
  }, [activeStyle, allStyles, activeStyleId]);

  const styleId = resolvedActiveStyle?.id || "core";
  const mascotId = editingMascot?.id || "";

  // Hook up video animation processing state and actions
  const { slots, activeJobs, isBusySlot, uploadVideo, retrySlot, replaceVideo, cancelJob } = useMascotAnimationProcessing({
    mascotId,
    styleId,
    onNotice,
  });

  // Calculate readiness count
  const thinkingReadyCount = slots.thinking.filter((s) => s.status === "ready").length;
  const celebrateReadyCount = slots.celebrate.filter((s) => s.status === "ready").length;
  const totalReadyCount = thinkingReadyCount + celebrateReadyCount;
  const totalSlots = 20;

  // Step 2 source variants for visual reference
  const thinkingSourceVariants = resolvedActiveStyle?.states?.thinking || [];
  const celebrateSourceVariants = resolvedActiveStyle?.states?.celebrate || [];

  return (
    <div className="wizard-step-content mascot-actions-step-container">
      <div className="wizard-card states-studio-card">
        {/* Step Header */}
        <div className="wizard-card-header-flex">
          <div>
            <span className="states-studio-badge">
              <FilmStrip size={13} weight="fill" />
              <span>Step 3: Animation Video Processing Studio</span>
            </span>
            <h3 className="states-studio-main-heading">Video Animation Pipeline</h3>
            <p className="states-studio-subheading">
              Upload 16:9 source videos (1280x720) for Thinking and Celebrate poses. Backgrounds are strictly removed, sequences matted,
              registered, and packaged into verified animation manifests.
            </p>
          </div>

          <div className="anim-ready-counter-card">
            <span className="anim-counter-number">
              {totalReadyCount} / {totalSlots}
            </span>
            <span className="anim-counter-label">Animations Ready</span>
            {totalReadyCount === totalSlots ? (
              <span className="anim-all-ready-tag">
                <CheckCircle size={12} weight="fill" />
                <span>All Complete</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* 1. Style Tabs Navigation */}
        <MascotStyleTabBar
          allStyles={allStyles}
          activeStyleId={activeStyleId}
          resolvedActiveStyle={resolvedActiveStyle}
          editingMascot={editingMascot}
          isBatchBusy={false}
          busySlotKey={null}
          onSelectStyle={setActiveStyleId}
          onManageStyles={onBackStep}
        />

        {/* 2. Two State Columns (10 Slots Each) */}
        <div className="variant-states-container">
          {/* Thinking State Column */}
          <div className="variant-state-col">
            <div className="variant-state-col-header">
              <div className="variant-state-title-wrap">
                <h4 className="variant-state-title">Thinking Animations</h4>
                <span className="variant-state-count-badge">{thinkingReadyCount} / 10 Ready</span>
              </div>
              <p className="variant-state-desc">Loops continuously during question deliberation.</p>
            </div>

            <div className="variant-slots-grid">
              {Array.from({ length: 10 }, (_, i) => {
                const slotIndex = i + 1;
                const projection = slots.thinking.find((s) => s.slot_index === slotIndex);
                const activeJob = projection?.active_job_id ? activeJobs[projection.active_job_id] : null;
                const sourceVariant = thinkingSourceVariants[i];
                const sourceImageUrl = sourceVariant?.transparent_image_url || sourceVariant?.image_url;

                return (
                  <AnimationProcessingSlotCard
                    key={`thinking-${slotIndex}`}
                    mascotId={mascotId}
                    styleId={styleId}
                    state="thinking"
                    slotIndex={slotIndex}
                    projection={projection}
                    activeJob={activeJob}
                    sourceImageUrl={sourceImageUrl}
                    isBusy={isBusySlot("thinking", slotIndex)}
                    onUploadVideo={(file) => uploadVideo("thinking", slotIndex, file)}
                    onRetry={() => retrySlot("thinking", slotIndex)}
                    onReplaceVideo={(file) => replaceVideo("thinking", slotIndex, file)}
                    onCancelJob={cancelJob}
                  />
                );
              })}
            </div>
          </div>

          {/* Celebrate State Column */}
          <div className="variant-state-col">
            <div className="variant-state-col-header">
              <div className="variant-state-title-wrap">
                <h4 className="variant-state-title">Celebrate Animations</h4>
                <span className="variant-state-count-badge">{celebrateReadyCount} / 10 Ready</span>
              </div>
              <p className="variant-state-desc">Plays once on correct answer or celebration events.</p>
            </div>

            <div className="variant-slots-grid">
              {Array.from({ length: 10 }, (_, i) => {
                const slotIndex = i + 1;
                const projection = slots.celebrate.find((s) => s.slot_index === slotIndex);
                const activeJob = projection?.active_job_id ? activeJobs[projection.active_job_id] : null;
                const sourceVariant = celebrateSourceVariants[i];
                const sourceImageUrl = sourceVariant?.transparent_image_url || sourceVariant?.image_url;

                return (
                  <AnimationProcessingSlotCard
                    key={`celebrate-${slotIndex}`}
                    mascotId={mascotId}
                    styleId={styleId}
                    state="celebrate"
                    slotIndex={slotIndex}
                    projection={projection}
                    activeJob={activeJob}
                    sourceImageUrl={sourceImageUrl}
                    isBusy={isBusySlot("celebrate", slotIndex)}
                    onUploadVideo={(file) => uploadVideo("celebrate", slotIndex, file)}
                    onRetry={() => retrySlot("celebrate", slotIndex)}
                    onReplaceVideo={(file) => replaceVideo("celebrate", slotIndex, file)}
                    onCancelJob={cancelJob}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Wizard Action Row */}
        <div className="wizard-action-row" style={{ marginTop: "28px" }}>
          <button type="button" className="quiet-button" onClick={onBackStep}>
            <ArrowLeft size={15} />
            <span>Back to Expressive States</span>
          </button>
          <button type="button" className="primary-button" onClick={onNextStep}>
            <span>Next: Motion Studio &amp; Preview</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
