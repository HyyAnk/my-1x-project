import { BUILT_IN_PRESETS, type IntroOutroSelection, type IntroOutroStyle } from "@studio/shared";

export type IntroOutroCategoryInfo = {
  name: string;
  icon: string;
};

export function buildMotionTemplateSummary(selection: IntroOutroSelection): string | null {
  if (selection.mode !== "motion_template") return null;
  const parts = [
    selection.intro_template_id ? `Intro: ${selection.intro_template_id}` : null,
    selection.outro_template_id ? `Outro: ${selection.outro_template_id}` : null,
  ];
  return parts.filter(Boolean).join(" · ") || "Configured";
}

export function buildIntroOutroDisplayValue(
  selection: IntroOutroSelection,
  motionSummary: string | null,
  selectedStyleName: string | undefined,
  categoryName: string,
): string {
  if (selection.mode === "none") return "None";
  if (selection.mode === "motion_template") return `Motion · ${motionSummary}`;
  if (selection.mode === "specific_pair") return selectedStyleName ?? "Specific Pair";
  return `Built-in Style · ${categoryName}`;
}

export function buildBuiltInStyleSubtitle(
  readyInCategory: number,
  categoryName: string,
  fallbackDefaultName: string | undefined,
): string | undefined {
  if (readyInCategory > 0) {
    return `${readyInCategory} ready pair${readyInCategory > 1 ? "s" : ""} in ${categoryName}`;
  }
  return fallbackDefaultName !== undefined ? `Fallback to channel default (${fallbackDefaultName})` : undefined;
}

export function getIntroOutroCategoryInfo(presetId?: string | null): IntroOutroCategoryInfo {
  if (!presetId) return { name: "Uncategorized", icon: "📦" };
  const found = BUILT_IN_PRESETS.find((preset) => preset.id === presetId);
  return { name: found?.name ?? "Custom Style", icon: found?.icon ?? "🎬" };
}

function rankFlag(condition: boolean): number {
  return condition ? 1 : 0;
}

/** Active styles first by matching preset, then the channel default, then by name. */
export function sortActiveIntroOutroStyles(
  styles: IntroOutroStyle[],
  categoryId: string,
  defaultStyleId: string | null | undefined,
): IntroOutroStyle[] {
  return styles
    .filter((style) => style.status === "active")
    .sort((a, b) => {
      const matchDelta = rankFlag(b.style_preset_id === categoryId) - rankFlag(a.style_preset_id === categoryId);
      if (matchDelta !== 0) return matchDelta;
      const defaultDelta = rankFlag(b.style_id === defaultStyleId) - rankFlag(a.style_id === defaultStyleId);
      if (defaultDelta !== 0) return defaultDelta;
      return a.name.localeCompare(b.name);
    });
}
