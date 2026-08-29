import type { MascotActionType, MascotProfile } from "@studio/shared";
import { MascotAnimationCanvas } from "./MascotAnimationCanvas";
import { MascotMotionControls } from "./MascotMotionControls";
import type { MascotMotionPreset, MascotMotionIntensity } from "../constants";

export type MascotAnimationStepProps = {
  editingMascot: MascotProfile | null;
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
};

export function MascotAnimationStep({
  editingMascot,
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
}: MascotAnimationStepProps) {
  const currentPreset = actionMotions[activePreviewAction] || "breathe";
  const currentSpeed = actionSpeeds[activePreviewAction] || 1.0;
  const currentIntensity = actionIntensities[activePreviewAction] || "normal";

  return (
    <div className="mascot-motion-studio-layout">
      {/* Left Pane: Animation Preview Canvas */}
      <MascotAnimationCanvas
        editingMascot={editingMascot}
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
      />

      {/* Right Pane: Motion Controls Panel */}
      <MascotMotionControls
        editingMascot={editingMascot}
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
      />
    </div>
  );
}
