import type { MascotActionType, MascotProfile, MascotStateVariant, MascotStyle } from "@studio/shared";
import { MascotAnimationCanvas } from "./MascotAnimationCanvas";
import { MascotMotionControls } from "./MascotMotionControls";
import { MascotVariantPanel } from "./MascotVariantPanel";
import { getActionVariants, isVariantAction } from "../utils/motionVariantPreview";
import type { MascotMotionPreset, MascotMotionIntensity } from "../constants";

export type MascotAnimationStepProps = {
  effectiveMascot: MascotProfile | null;
  genColor: string;
  busyAction: string | null;
  activePreviewAction: MascotActionType;
  setActivePreviewAction: (action: MascotActionType) => void;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  canvasBackground: "dark" | "light" | "grid" | "clean";
  setCanvasBackground: (bg: "dark" | "light" | "grid" | "clean") => void;
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
  flipHorizontal: boolean;
  setFlipHorizontal: React.Dispatch<React.SetStateAction<boolean>>;
  actionMotions: Record<MascotActionType, MascotMotionPreset>;
  actionSpeeds: Record<MascotActionType, number>;
  actionIntensities: Record<MascotActionType, MascotMotionIntensity>;
  calibrating: boolean;
  onChangeMotionPreset: (action: MascotActionType, preset: MascotMotionPreset) => void;
  onChangeMotionSpeed: (action: MascotActionType, speed: number) => void;
  onChangeMotionIntensity: (action: MascotActionType, intensity: MascotMotionIntensity) => void;
  onResetDefaultMotions: () => void;
  onSaveMotion: (action?: MascotActionType) => void;
  onFinishMascot: () => void;
  onBackStep: () => void;
  activeStyle: MascotStyle | null;
  previewStyleId: string | null;
  onPreviewStyleChange: (styleId: string | null) => void;
  activeVariants: MascotStateVariant[];
  selectedVariant: MascotStateVariant | null;
  activeVariantIndex: number;
  onSelectVariantIndex: (index: number) => void;
};

export function MascotAnimationStep({
  effectiveMascot,
  genColor,
  busyAction,
  activePreviewAction,
  setActivePreviewAction,
  isPlaying,
  setIsPlaying,
  canvasBackground,
  setCanvasBackground,
  canvasZoom,
  setCanvasZoom,
  flipHorizontal,
  setFlipHorizontal,
  actionMotions,
  actionSpeeds,
  actionIntensities,
  calibrating,
  onChangeMotionPreset,
  onChangeMotionSpeed,
  onChangeMotionIntensity,
  onResetDefaultMotions,
  onSaveMotion,
  onFinishMascot,
  onBackStep,
  activeStyle,
  previewStyleId,
  onPreviewStyleChange,
  activeVariants,
  selectedVariant,
  activeVariantIndex,
  onSelectVariantIndex,
}: MascotAnimationStepProps) {
  const currentPreset = actionMotions[activePreviewAction] || "breathe";
  const currentSpeed = actionSpeeds[activePreviewAction] || 1.0;
  const currentIntensity = actionIntensities[activePreviewAction] || "normal";
  const isVariant = isVariantAction(activePreviewAction);

  const variantCounts = activeStyle
    ? {
        thinking: getActionVariants(activeStyle, "thinking").length,
        celebrate: getActionVariants(activeStyle, "celebrate").length,
      }
    : {};

  return (
    <div className="mascot-motion-studio-layout">
      {/* Left Pane: Animation Preview Canvas */}
      <div className="motion-left-pane">
        {isVariant && activeStyle && (
          <div className="motion-style-indicator">
            <span className="motion-style-indicator-name">{activeStyle.name}</span>
            {selectedVariant && (
              <span className="motion-style-indicator-slot">
                Slot {selectedVariant.slot_index}/{activeVariants.length}
              </span>
            )}
          </div>
        )}

        <MascotAnimationCanvas
          editingMascot={effectiveMascot}
          activePreviewAction={activePreviewAction}
          setActivePreviewAction={setActivePreviewAction}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          canvasBackground={canvasBackground}
          setCanvasBackground={setCanvasBackground}
          canvasZoom={canvasZoom}
          setCanvasZoom={setCanvasZoom}
          flipHorizontal={flipHorizontal}
          setFlipHorizontal={setFlipHorizontal}
          motionPreset={currentPreset}
          motionSpeed={currentSpeed}
          motionIntensity={currentIntensity}
          genColor={genColor}
          variantCounts={variantCounts}
        />
      </div>

      {/* Right Pane: Variant Panel + Motion Controls */}
      <div className="motion-right-pane">
        {isVariant && (
          <MascotVariantPanel
            editingMascot={effectiveMascot}
            activeStyle={activeStyle}
            previewStyleId={previewStyleId}
            onPreviewStyleChange={onPreviewStyleChange}
            activePreviewAction={activePreviewAction}
            variants={activeVariants}
            activeVariantIndex={activeVariantIndex}
            onSelectVariantIndex={onSelectVariantIndex}
          />
        )}

        <MascotMotionControls
          editingMascot={effectiveMascot}
          activePreviewAction={activePreviewAction}
          actionMotions={actionMotions}
          actionSpeeds={actionSpeeds}
          actionIntensities={actionIntensities}
          onChangeMotionPreset={onChangeMotionPreset}
          onChangeMotionSpeed={onChangeMotionSpeed}
          onChangeMotionIntensity={onChangeMotionIntensity}
          onResetDefaultMotions={onResetDefaultMotions}
          onSaveMotion={onSaveMotion}
          onFinishMascot={onFinishMascot}
          onBackStep={onBackStep}
          calibrating={calibrating}
          busyAction={busyAction}
          selectedVariant={isVariant ? selectedVariant : null}
        />
      </div>
    </div>
  );
}
