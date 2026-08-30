import { useCallback, useEffect, useMemo, useState } from "react";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET, type MascotActionType, type MascotProfile } from "@studio/shared";
import { api } from "../../../api";

export function useSandboxMascotState() {
  const [mascots, setMascots] = useState<MascotProfile[]>([]);
  const [mascotId, setMascotId] = useState("none");
  const [mascotEnabled, setMascotEnabled] = useState(false);
  const [mascotAction, setMascotAction] = useState<MascotActionType>("thinking");
  const [mascotPosition, setMascotPosition] = useState<"bottom_left" | "bottom_right">(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);
  const [mascotScale, setMascotScale] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
  const [mascotOffsetX, setMascotOffsetX] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x);
  const [mascotOffsetY, setMascotOffsetY] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y);
  const [mascotFlipX, setMascotFlipX] = useState<boolean>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x);

  useEffect(() => {
    api
      .mascots()
      .then((res) => {
        if (res?.mascots) setMascots(res.mascots);
      })
      .catch(() => {
        // Mascots are optional in the sandbox
      });
  }, []);

  const resetToDefaultPlacement = useCallback(() => {
    setMascotPosition(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);
    setMascotScale(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
    setMascotOffsetX(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x);
    setMascotOffsetY(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y);
    setMascotFlipX(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x);
  }, []);

  const activeMascot = useMemo(() => {
    if (!mascotId || mascotId === "none") return null;
    return mascots.find((mascot) => mascot.id === mascotId) || null;
  }, [mascots, mascotId]);

  return {
    mascots,
    mascotId,
    setMascotId,
    mascotEnabled,
    setMascotEnabled,
    mascotAction,
    setMascotAction,
    mascotPosition,
    setMascotPosition,
    mascotScale,
    setMascotScale,
    mascotOffsetX,
    setMascotOffsetX,
    mascotOffsetY,
    setMascotOffsetY,
    mascotFlipX,
    setMascotFlipX,
    resetToDefaultPlacement,
    activeMascot,
  };
}

export type SandboxMascotState = ReturnType<typeof useSandboxMascotState>;
