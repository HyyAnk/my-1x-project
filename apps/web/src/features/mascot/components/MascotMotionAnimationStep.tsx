import { useMemo } from "react";
import { MascotStyleTabBar } from "./MascotStyleTabBar";
import { useStep4AnimationPreview, ManifestPlaybackBar } from "../animation";
import type { MascotAnimationStepProps } from "./MascotAnimationStep";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import type { Notice } from "../../../components/types";
import { useMascotAnimationHotkeys } from "../hooks/useMascotAnimationHotkeys";
import { useMascotStepStyles } from "../hooks/useMascotStepStyles";
import {
  MascotMotionStepHeader,
  MascotMotionStepToolbar,
  MascotMotionStepCanvasView,
  MascotMotionStepContactSheet,
  MascotMotionStepSlotSidebar,
} from "./motionStep";

export interface MascotMotionAnimationStepProps extends MascotAnimationStepProps {
  stylesState: ReturnType<typeof useMascotStyles>;
  onNotice?: (notice: Notice) => void;
  onGoToStep3?: () => void;
}

export function MascotMotionAnimationStep(props: MascotMotionAnimationStepProps) {
  const {
    effectiveMascot,
    stylesState,
    onBackStep,
    onFinishMascot,
    busyAction,
    canvasBackground,
    setCanvasBackground,
    canvasZoom,
    setCanvasZoom,
    flipHorizontal,
    setFlipHorizontal,
    onGoToStep3,
  } = props;

  const { activeStyleId, setActiveStyleId, activeStyle, busySlotKey, batchProgress } = stylesState;
  const isBatchBusy = batchProgress !== null || busySlotKey === "batch";

  const { allStyles, resolvedActiveStyle } = useMascotStepStyles(effectiveMascot, activeStyle, activeStyleId);

  const preview = useStep4AnimationPreview({
    mascotId: effectiveMascot?.id,
    styleId: resolvedActiveStyle?.id || "core",
  });

  const {
    activeState,
    setActiveState,
    activeSlotIndex,
    setActiveSlotIndex,
    slotsData,
    activeSlot,
    activeAnimationAsset,
    readyCount,
    previewMode,
    setPreviewMode,
    placement,
    setPlacement,
    showGuides,
    setShowGuides,
    showContactSheet,
    setShowContactSheet,
    playback,
  } = preview;

  const { handleKeyDown } = useMascotAnimationHotkeys(playback);

  const fallbackImageUrl = useMemo(() => {
    const stateSlots = activeState === "thinking" ? effectiveMascot?.actions.thinking : effectiveMascot?.actions.celebrate;
    return stateSlots?.sprite_url || effectiveMascot?.master_image_url || undefined;
  }, [activeState, effectiveMascot]);

  return (
    <div
      className="mascot-step4-container"
      data-testid="step4-motion-animation-step"
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <MascotMotionStepHeader onBackStep={onBackStep} readyCount={readyCount} busyAction={busyAction} onFinishMascot={onFinishMascot} />

      {allStyles.length > 1 && (
        <MascotStyleTabBar
          allStyles={allStyles}
          activeStyleId={resolvedActiveStyle?.id || "core"}
          resolvedActiveStyle={resolvedActiveStyle}
          editingMascot={effectiveMascot}
          isBatchBusy={isBatchBusy}
          busySlotKey={busySlotKey}
          onSelectStyle={setActiveStyleId}
          onManageStyles={onBackStep}
        />
      )}

      <div
        className="step4-studio-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(340px, 1fr)",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <MascotMotionStepToolbar
            canvasBackground={canvasBackground}
            setCanvasBackground={setCanvasBackground}
            flipHorizontal={flipHorizontal}
            setFlipHorizontal={setFlipHorizontal}
            canvasZoom={canvasZoom}
            setCanvasZoom={setCanvasZoom}
          />

          <MascotMotionStepCanvasView
            previewMode={previewMode}
            animation={activeAnimationAsset}
            fallbackImageUrl={fallbackImageUrl}
            timeSeconds={playback.timeSeconds}
            isPlaying={playback.isPlaying}
            isLooping={playback.isLooping}
            canvasBackground={canvasBackground}
            canvasZoom={canvasZoom}
            flipHorizontal={flipHorizontal}
            placement={placement}
            showGuides={showGuides}
          />

          <ManifestPlaybackBar
            isPlaying={playback.isPlaying}
            isLooping={playback.isLooping}
            currentFrameIndex={playback.currentFrameIndex}
            frameCount={playback.frameCount}
            timeSeconds={playback.timeSeconds}
            cycleSeconds={playback.cycleSeconds}
            previewMode={previewMode}
            showContactSheet={showContactSheet}
            onTogglePlay={playback.togglePlay}
            onToggleLoop={playback.toggleLoop}
            onStepForward={playback.stepForward}
            onStepBackward={playback.stepBackward}
            onSeekFrame={playback.seekFrame}
            onChangePreviewMode={setPreviewMode}
            onToggleContactSheet={() => setShowContactSheet((prev) => !prev)}
          />

          <MascotMotionStepContactSheet
            showContactSheet={showContactSheet}
            animation={activeAnimationAsset}
            activeFrameIndex={playback.currentFrameIndex}
            onSelectFrame={playback.seekFrame}
          />
        </div>

        <MascotMotionStepSlotSidebar
          activeState={activeState}
          onChangeState={setActiveState}
          activeSlotIndex={activeSlotIndex}
          onSelectSlot={setActiveSlotIndex}
          slotsData={slotsData}
          activeSlot={activeSlot}
          previewMode={previewMode}
          placement={placement}
          onChangePlacement={setPlacement}
          showGuides={showGuides}
          onToggleGuides={() => setShowGuides((prev) => !prev)}
          onGoToStep3={onGoToStep3 || onBackStep}
        />
      </div>
    </div>
  );
}
