import { useEffect, useMemo, useState } from "react";
import type { MascotActionType, MascotProfile } from "@studio/shared";
import { api } from "../../../api";

export function useSandboxMascotState() {
  const [mascots, setMascots] = useState<MascotProfile[]>([]);
  const [mascotId, setMascotId] = useState("none");
  const [mascotEnabled, setMascotEnabled] = useState(false);
  const [mascotAction, setMascotAction] = useState<MascotActionType>("thinking");
  const [mascotPosition, setMascotPosition] = useState<"bottom_left" | "bottom_right">("bottom_left");
  const [mascotScale, setMascotScale] = useState(1);
  const [mascotOffsetX, setMascotOffsetX] = useState(0);
  const [mascotOffsetY, setMascotOffsetY] = useState(0);
  const [mascotFlipX, setMascotFlipX] = useState(false);

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
    activeMascot,
  };
}

export type SandboxMascotState = ReturnType<typeof useSandboxMascotState>;
