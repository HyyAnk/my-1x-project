import { BUILT_IN_PRESETS, type IntroOutroStyle } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";

async function findReadyStyleIds(repository: RepositoryService, channelId: string, styles: IntroOutroStyle[]): Promise<Set<string>> {
  const readiness = await Promise.all(
    styles.map(async (style) => {
      if (style.status !== "active") return null;
      try {
        await Promise.all([
          repository.getIntroOutroClipPath(channelId, style.style_id, "intro"),
          repository.getIntroOutroClipPath(channelId, style.style_id, "outro"),
        ]);
        return style.style_id;
      } catch {
        return null;
      }
    }),
  );
  return new Set(readiness.filter((styleId): styleId is string => styleId !== null));
}

export async function listIntroOutroCategorySummaries(repository: RepositoryService, channelId: string) {
  const styles = await repository.listChannelIntroOutroStyles(channelId);
  const readyStyleIds = await findReadyStyleIds(repository, channelId, styles);
  const categories = BUILT_IN_PRESETS.map((preset) => {
    const categoryStyles = styles.filter((style) => style.style_preset_id === preset.id);
    return {
      style_preset_id: preset.id,
      name: preset.name,
      icon: preset.icon,
      total_count: categoryStyles.length,
      ready_count: categoryStyles.filter((style) => readyStyleIds.has(style.style_id)).length,
    };
  });
  const uncategorized = styles.filter((style) => !style.style_preset_id);
  if (uncategorized.length === 0) return categories;
  return [
    ...categories,
    {
      style_preset_id: "uncategorized",
      name: "Uncategorized",
      icon: "",
      total_count: uncategorized.length,
      ready_count: uncategorized.filter((style) => readyStyleIds.has(style.style_id)).length,
    },
  ];
}
