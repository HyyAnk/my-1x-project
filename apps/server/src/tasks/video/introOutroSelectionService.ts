import { findBuiltInPresetById, resolveBuiltInPresetCategoryId, type Channel, type Episode, type IntroOutroStyle } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";

export type IntroOutroSelectionSource = "style_builtin" | "specific_pair" | "legacy_default" | "none";

export type ResolvedIntroOutroPair = {
  source: IntroOutroSelectionSource;
  stylePresetId?: string;
  style?: IntroOutroStyle;
  introSourcePath?: string;
  outroSourcePath?: string;
  unavailableReason?: string;
};

function getSelectionIntent(episode: Episode): { mode: "style_builtin" | "specific_pair" | "none"; styleId?: string } {
  const selection = episode.quiz_config.intro_outro_selection ?? { mode: "style_builtin" as const };
  const legacyStyleId = episode.quiz_config.intro_outro_style_id;
  if (selection.mode !== "style_builtin") {
    return selection.mode === "specific_pair" ? { mode: selection.mode, styleId: selection.style_id } : { mode: "none" };
  }
  if (legacyStyleId === "none") return { mode: "none" };
  if (legacyStyleId) return { mode: "specific_pair", styleId: legacyStyleId };
  return { mode: "style_builtin" };
}

async function resolveReadyPaths(repository: RepositoryService, channelId: string, style: IntroOutroStyle) {
  if (style.status === "disabled") return null;
  try {
    const [introSourcePath, outroSourcePath] = await Promise.all([
      repository.getIntroOutroClipPath(channelId, style.style_id, "intro"),
      repository.getIntroOutroClipPath(channelId, style.style_id, "outro"),
    ]);
    return { style, introSourcePath, outroSourcePath };
  } catch {
    return null;
  }
}

async function resolveSpecificPair(repository: RepositoryService, channelId: string, styleId: string): Promise<ResolvedIntroOutroPair> {
  const style = await repository.getChannelIntroOutroStyle(channelId, styleId);
  const ready = style ? await resolveReadyPaths(repository, channelId, style) : null;
  if (!ready) throw new RepositoryError(`Intro/Outro pair is unavailable: ${styleId}`, "INTRO_OUTRO_PAIR_UNAVAILABLE");
  return { source: "specific_pair", stylePresetId: style?.style_preset_id ?? undefined, ...ready };
}

async function resolveLegacyDefault(
  repository: RepositoryService,
  channel: Channel,
  stylePresetId: string,
): Promise<ResolvedIntroOutroPair | null> {
  if (!channel.default_intro_outro_style_id) return null;
  const style = await repository.getChannelIntroOutroStyle(channel.channel_id, channel.default_intro_outro_style_id);
  const ready = style ? await resolveReadyPaths(repository, channel.channel_id, style) : null;
  return ready ? { source: "legacy_default", stylePresetId, ...ready } : null;
}

export async function selectIntroOutroPair(
  repository: RepositoryService,
  channel: Channel,
  episode: Episode,
  taskId: string,
): Promise<ResolvedIntroOutroPair> {
  const intent = getSelectionIntent(episode);
  if (intent.mode === "none") return { source: "none" };
  if (intent.mode === "specific_pair" && intent.styleId) {
    return resolveSpecificPair(repository, channel.channel_id, intent.styleId);
  }

  const stylePresetId = resolveBuiltInPresetCategoryId(episode.quiz_config);
  const styles = await repository.listChannelIntroOutroStyles(channel.channel_id);
  const categoryStyles = styles.filter((style) => style.style_preset_id === stylePresetId && style.status === "active");
  const readyCandidates = (
    await Promise.all(categoryStyles.map((style) => resolveReadyPaths(repository, channel.channel_id, style)))
  ).filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);

  if (readyCandidates.length > 0) {
    const styleId = await repository.reserveChannelIntroOutroStyle(
      channel.channel_id,
      episode.episode_id,
      taskId,
      stylePresetId,
      readyCandidates.map((candidate) => candidate.style.style_id),
    );
    const selected = readyCandidates.find((candidate) => candidate.style.style_id === styleId)!;
    return { source: "style_builtin", stylePresetId, ...selected };
  }

  const legacyDefault = await resolveLegacyDefault(repository, channel, stylePresetId);
  if (legacyDefault) return legacyDefault;
  if (styles.length === 0) {
    return {
      source: "style_builtin",
      stylePresetId,
      unavailableReason: `No Intro/Outro pairs are configured for ${findBuiltInPresetById(stylePresetId)?.name ?? stylePresetId}`,
    };
  }

  const categoryName = findBuiltInPresetById(stylePresetId)?.name ?? stylePresetId;
  throw new RepositoryError(`No ready Intro/Outro pairs for ${categoryName}`, "INTRO_OUTRO_CATEGORY_EMPTY");
}
