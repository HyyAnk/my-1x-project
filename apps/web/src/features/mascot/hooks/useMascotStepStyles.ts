import { useMemo } from "react";
import { reconcileMascotBuiltInStyles, synthesizeLegacyCoreStyle, type MascotProfile, type MascotStyle } from "@studio/shared";

export function useMascotStepStyles(
  mascot: MascotProfile | null | undefined,
  activeStyle: MascotStyle | null | undefined,
  activeStyleId: string,
) {
  const allStyles = useMemo<MascotStyle[]>(() => {
    if (!mascot) return [synthesizeLegacyCoreStyle({})];
    return reconcileMascotBuiltInStyles(mascot).styles ?? [];
  }, [mascot]);

  const resolvedActiveStyle = useMemo<MascotStyle | null>(() => {
    const requestedStyleId = activeStyle?.id || activeStyleId;
    return allStyles.find((style) => style.id === requestedStyleId) ?? activeStyle ?? allStyles[0] ?? null;
  }, [activeStyle, activeStyleId, allStyles]);

  return { allStyles, resolvedActiveStyle };
}
