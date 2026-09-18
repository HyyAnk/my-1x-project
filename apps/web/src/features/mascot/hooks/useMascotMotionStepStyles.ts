import { useMemo } from "react";
import { type MascotProfile, type MascotStyle, synthesizeLegacyCoreStyle } from "@studio/shared";

export function useMascotMotionStepStyles(
  effectiveMascot: MascotProfile | null | undefined,
  activeStyle: MascotStyle | null | undefined,
  activeStyleId: string,
) {
  const allStyles = useMemo<MascotStyle[]>(() => {
    const rawStyles = effectiveMascot?.styles && effectiveMascot.styles.length > 0 ? [...effectiveMascot.styles] : [];
    const hasCore = rawStyles.some((s) => s.id === "core" || s.is_default);
    if (!hasCore) {
      rawStyles.unshift(synthesizeLegacyCoreStyle(effectiveMascot || {}));
    }
    return rawStyles;
  }, [effectiveMascot]);

  const resolvedActiveStyle = useMemo<MascotStyle | null>(() => {
    if (activeStyle) return activeStyle;
    return allStyles.find((s) => s.id === activeStyleId) || allStyles[0] || null;
  }, [activeStyle, allStyles, activeStyleId]);

  return { allStyles, resolvedActiveStyle };
}
