import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RECOMMENDED_MASCOT_PLACEMENT_PRESET,
  resolveMascotStyle,
  type MascotActionType,
  type MascotProfile,
  type MascotStyle,
  type MascotStateVariant,
} from "@studio/shared";
import { api } from "../../../api";

export type SandboxMascotAction = "thinking" | "celebrate";

export function useSandboxMascotState() {
  const [mascots, setMascots] = useState<MascotProfile[]>([]);
  const [mascotId, setMascotId] = useState("none");
  const [mascotStyleId, setMascotStyleId] = useState<string | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);
  const [mascotEnabled, setMascotEnabled] = useState(false);
  const [mascotAction, setMascotActionState] = useState<SandboxMascotAction>("thinking");
  const [mascotPosition, setMascotPosition] = useState<"bottom_left" | "bottom_right">(RECOMMENDED_MASCOT_PLACEMENT_PRESET.position);
  const [mascotScale, setMascotScale] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale);
  const [mascotOffsetX, setMascotOffsetX] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_x);
  const [mascotOffsetY, setMascotOffsetY] = useState<number>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.offset_y);
  const [mascotFlipX, setMascotFlipX] = useState<boolean>(RECOMMENDED_MASCOT_PLACEMENT_PRESET.flip_x);

  const setMascotAction = useCallback((action: MascotActionType | SandboxMascotAction) => {
    if (action === "celebrate") {
      setMascotActionState("celebrate");
    } else {
      // Normalize any non-variant or legacy action to "thinking"
      setMascotActionState("thinking");
    }
  }, []);

  useEffect(() => {
    api
      .mascots()
      .then((res) => {
        if (res?.mascots) {
          setMascots(res.mascots);
          if (res.mascots.length > 0) {
            const first = res.mascots[0];
            setMascotId(first.id);
            setMascotEnabled(true);
            const defaultStyle = first.styles?.find((s) => s.is_default) || first.styles?.[0];
            setMascotStyleId(first.active_style_id || defaultStyle?.id || null);
          }
        }
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

  const availableStyles: MascotStyle[] = useMemo(() => {
    return activeMascot?.styles || [];
  }, [activeMascot]);

  useEffect(() => {
    if (!activeMascot) {
      setMascotStyleId(null);
      return;
    }
    const defaultStyle = activeMascot.styles?.find((s) => s.is_default) || activeMascot.styles?.[0];
    setMascotStyleId(activeMascot.active_style_id || defaultStyle?.id || null);
  }, [activeMascot?.id, activeMascot?.active_style_id]);

  const activeStyle: MascotStyle | null = useMemo(() => {
    if (!activeMascot) return null;
    return resolveMascotStyle(activeMascot, mascotStyleId);
  }, [activeMascot, mascotStyleId]);

  const thinkingVariants: MascotStateVariant[] = useMemo(() => {
    const filled = (activeStyle?.states?.thinking || []).filter((v) => Boolean(v.image_url?.trim()));
    if (filled.length > 0) {
      return filled;
    }
    const anchorUrl = activeStyle?.anchor_image_url?.trim();
    if (anchorUrl) {
      return [
        {
          id: `${activeStyle?.id || "style"}_anchor_thinking`,
          slot_index: 1,
          image_url: anchorUrl,
          motion_preset: "sway",
          motion_speed: 1.0,
          motion_intensity: "normal",
        },
      ];
    }
    return [];
  }, [activeStyle]);

  const celebrateVariants: MascotStateVariant[] = useMemo(() => {
    const filled = (activeStyle?.states?.celebrate || []).filter((v) => Boolean(v.image_url?.trim()));
    if (filled.length > 0) {
      return filled;
    }
    const anchorUrl = activeStyle?.anchor_image_url?.trim();
    if (anchorUrl) {
      return [
        {
          id: `${activeStyle?.id || "style"}_anchor_celebrate`,
          slot_index: 1,
          image_url: anchorUrl,
          motion_preset: "jump",
          motion_speed: 1.0,
          motion_intensity: "normal",
        },
      ];
    }
    return [];
  }, [activeStyle]);

  // When style changes, if the current action is thinking/celebrate, preserve or resolve appropriate variant.
  useEffect(() => {
    if (mascotAction === "thinking") {
      if (thinkingVariants.length === 0) {
        setSelectedVariantIndex(null);
      } else if (selectedVariantIndex !== null && selectedVariantIndex < thinkingVariants.length) {
        // preserve current variant index
      } else {
        setSelectedVariantIndex(0);
      }
    } else if (mascotAction === "celebrate") {
      if (celebrateVariants.length === 0) {
        setSelectedVariantIndex(null);
      } else if (selectedVariantIndex !== null && selectedVariantIndex < celebrateVariants.length) {
        // preserve current variant index
      } else {
        setSelectedVariantIndex(0);
      }
    } else {
      setSelectedVariantIndex(null);
    }
  }, [mascotStyleId, mascotAction, thinkingVariants.length, celebrateVariants.length]);

  return {
    mascots,
    mascotId,
    setMascotId,
    mascotStyleId,
    setMascotStyleId,
    mascot_style_id: mascotStyleId || undefined,
    availableStyles,
    activeStyle,
    thinkingVariants,
    celebrateVariants,
    selectedVariantIndex,
    setSelectedVariantIndex,
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
