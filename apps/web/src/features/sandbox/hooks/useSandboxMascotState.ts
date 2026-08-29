import { useEffect, useMemo, useState } from "react";
import type { MascotActionType, MascotProfile } from "@studio/shared";
import { api } from "../../../api";

export function useSandboxMascotState() {
  const [mascots, setMascots] = useState<MascotProfile[]>([]);
  const [mascotId, setMascotId] = useState("fallback");
  const [mascotEnabled, setMascotEnabled] = useState(true);
  const [mascotAction, setMascotAction] = useState<MascotActionType>("thinking");
  const [mascotPosition, setMascotPosition] = useState<"bottom_left" | "bottom_right">("bottom_left");
  const [mascotScale, setMascotScale] = useState(1);
  const [mascotOffsetX, setMascotOffsetX] = useState(0);
  const [mascotOffsetY, setMascotOffsetY] = useState(0);

  useEffect(() => {
    api
      .mascots()
      .then((res) => {
        if (res?.mascots) setMascots(res.mascots);
      })
      .catch(() => {
        // Mascots are optional in the sandbox, so the fallback remains available.
      });
  }, []);

  const activeMascot = useMemo(() => {
    if (!mascotId || mascotId === "none" || mascotId === "fallback") return null;
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
    activeMascot,
  };
}

export type SandboxMascotState = ReturnType<typeof useSandboxMascotState>;
