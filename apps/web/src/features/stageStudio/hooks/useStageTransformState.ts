import { useState } from "react";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET } from "@studio/shared";
import type { StagePosition } from "../types";

export function useStageTransformState() {
  const [position, setPosition] = useState<StagePosition>("bottom_left");
  const [scale, setScale] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
  const [offsetX, setOffsetX] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x);
  const [offsetY, setOffsetY] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [showInIntro, setShowInIntro] = useState<boolean>(false);
  const [showInOutro, setShowInOutro] = useState<boolean>(false);
  const [showInQuestion, setShowInQuestion] = useState<boolean>(true);

  return {
    position,
    setPosition,
    scale,
    setScale,
    offsetX,
    setOffsetX,
    offsetY,
    setOffsetY,
    flipHorizontal,
    setFlipHorizontal,
    showInIntro,
    setShowInIntro,
    showInOutro,
    setShowInOutro,
    showInQuestion,
    setShowInQuestion,
  };
}
