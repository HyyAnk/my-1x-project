import { resolveAnimationFrameAtTime } from "@studio/shared";
import type { MascotActionType, MascotAnimationAssetV1, MascotProfile, MascotPublishedAnimationAsset } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta, type MascotMotionPreset } from "../constants";
import { resolveCanvasMediaAndMotion } from "./canvas/canvasMediaResolver";
import { MascotCanvasToolbar, type CanvasBackgroundMode } from "./canvas/MascotCanvasToolbar";
import { MascotCanvasViewport } from "./canvas/MascotCanvasViewport";
import { MascotCanvasBottomBar } from "./canvas/MascotCanvasBottomBar";

export type MascotAnimationCanvasProps = {
  editingMascot: MascotProfile | null;
  activePreviewAction: MascotActionType;
  setActivePreviewAction: (action: MascotActionType) => void;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  canvasBackground: CanvasBackgroundMode;
  setCanvasBackground: (bg: CanvasBackgroundMode) => void;
  canvasZoom: number;
  setCanvasZoom: React.Dispatch<React.SetStateAction<number>>;
  flipHorizontal: boolean;
  setFlipHorizontal: React.Dispatch<React.SetStateAction<boolean>>;
  motionPreset?: MascotMotionPreset;
  motionSpeed?: number;
  motionIntensity?: "subtle" | "normal" | "dynamic";
  genColor: string;
  variantCounts?: Partial<Record<MascotActionType, number>>;
  animation?: MascotAnimationAssetV1 | MascotPublishedAnimationAsset | null;
  timeSeconds?: number;
};

export function MascotAnimationCanvas({
  editingMascot,
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
  motionPreset,
  motionSpeed,
  motionIntensity,
  genColor,
  variantCounts,
  animation,
  timeSeconds = 0,
}: MascotAnimationCanvasProps) {
  const { t } = useTranslation();
  const activeActionMeta = getLocalizedActionMeta(activePreviewAction, t);

  const { videoUrl, spriteImageUrl, effectiveMotionPreset, effectiveMotionSpeed, intensityMultiplier } = resolveCanvasMediaAndMotion({
    editingMascot,
    activePreviewAction,
    animation,
    motionPreset,
    motionSpeed,
    motionIntensity,
  });

  const resolvedFrame = animation ? resolveAnimationFrameAtTime(animation, timeSeconds) : null;

  return (
    <div className="motion-canvas-card">
      <MascotCanvasToolbar
        canvasBackground={canvasBackground}
        setCanvasBackground={setCanvasBackground}
        flipHorizontal={flipHorizontal}
        setFlipHorizontal={setFlipHorizontal}
        canvasZoom={canvasZoom}
        setCanvasZoom={setCanvasZoom}
      />

      <MascotCanvasViewport
        canvasBackground={canvasBackground}
        canvasZoom={canvasZoom}
        flipHorizontal={flipHorizontal}
        effectiveMotionSpeed={effectiveMotionSpeed}
        intensityMultiplier={intensityMultiplier}
        videoUrl={videoUrl}
        resolvedFrame={resolvedFrame}
        animation={animation}
        spriteImageUrl={spriteImageUrl}
        isPlaying={isPlaying}
        effectiveMotionPreset={effectiveMotionPreset}
        genColor={genColor}
        actionLabel={activeActionMeta.label}
      />

      <MascotCanvasBottomBar
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        editingMascot={editingMascot}
        activePreviewAction={activePreviewAction}
        setActivePreviewAction={setActivePreviewAction}
        variantCounts={variantCounts}
      />
    </div>
  );
}
