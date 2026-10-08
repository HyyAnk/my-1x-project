import { randomInt } from "node:crypto";
import { nowIso, resolveBuiltInPresetCategoryId, type Channel, type Episode, type IntroOutroSnapshot } from "@studio/shared";
import { RepositoryError } from "../../repository.js";
import { probeAndValidate1080pVideo } from "../../utils/videoMediaProbe.js";
import { pairFingerprint, readyPair, type ReadyPair, type PairRepository } from "./pairMedia.js";
import { readIntroOutroSnapshot, writeIntroOutroSnapshot } from "../../repository/introOutroSnapshotStore.js";
import { applyBookendEnablement, resolveBookendEnablement } from "./bookendEnablement.js";

export function introOutroSelectionKey(episode: Episode): string {
  return JSON.stringify([episode.quiz_config.intro_outro_selection, resolveBuiltInPresetCategoryId(episode.quiz_config)]);
}

async function choosePair(repository: PairRepository, channel: Channel, episode: Episode): Promise<ReadyPair | null> {
  const selection = episode.quiz_config.intro_outro_selection;
  if (selection.mode === "none" || selection.mode === "motion_template") return null;
  if (selection.mode === "specific_pair") {
    const style = await repository.getChannelIntroOutroStyle(channel.channel_id, selection.style_id);
    const pair = style ? await readyPair(repository, channel.channel_id, style) : null;
    if (!pair) throw new RepositoryError("Selected Intro/Outro pair is unavailable", "INTRO_OUTRO_PAIR_UNAVAILABLE");
    return pair;
  }
  const category = resolveBuiltInPresetCategoryId(episode.quiz_config);
  const styles = await repository.listChannelIntroOutroStyles(channel.channel_id);
  const candidates = (
    await Promise.all(
      styles.filter((style) => style.style_preset_id === category).map((style) => readyPair(repository, channel.channel_id, style)),
    )
  ).filter((pair): pair is ReadyPair => pair !== null);
  if (candidates.length) return candidates[randomInt(candidates.length)];
  if (channel.default_intro_outro_style_id) {
    const defaultStyle = styles.find((style) => style.style_id === channel.default_intro_outro_style_id);
    if (defaultStyle && !defaultStyle.style_preset_id) {
      const pair = await readyPair(repository, channel.channel_id, defaultStyle);
      if (pair) return pair;
    }
  }
  return null;
}

async function createSnapshot(repository: PairRepository, channel: Channel, episode: Episode): Promise<IntroOutroSnapshot> {
  const pair = await choosePair(repository, channel, episode);
  const media = pair
    ? await Promise.all([probeAndValidate1080pVideo(pair.introSourcePath), probeAndValidate1080pVideo(pair.outroSourcePath)])
    : null;
  return {
    version: 1,
    selection_key: introOutroSelectionKey(episode),
    resolved_visual_style: episode.quiz_config.resolved_visual_style,
    style_preset_id: resolveBuiltInPresetCategoryId(episode.quiz_config),
    pair_id: pair?.style.style_id ?? null,
    fingerprint: pair ? await pairFingerprint(pair) : null,
    intro_duration_seconds: media?.[0].duration_seconds ?? 0,
    outro_duration_seconds: media?.[1].duration_seconds ?? 0,
    selected_at: nowIso(),
    intro_has_audio: media?.[0].has_audio ?? false,
    outro_has_audio: media?.[1].has_audio ?? false,
  };
}

/** Persist before publication so retries and concurrent stages share one decision. */
export async function pinIntroOutroSelection(
  repository: PairRepository,
  channel: Channel,
  episode: Episode,
  creation = false,
): Promise<IntroOutroSnapshot> {
  return repository.queueEpisodeArtifactMutation(channel.channel_id, episode.episode_id, async () => {
    let saved = (await readIntroOutroSnapshot(repository, channel.slug, episode.episode_id)) ?? episode.quiz_config.intro_outro_snapshot;
    if (saved && creation) episode.quiz_config.resolved_visual_style = saved.resolved_visual_style;
    if (saved?.selection_key !== introOutroSelectionKey(episode)) saved = await createSnapshot(repository, channel, episode);
    await writeIntroOutroSnapshot(repository, channel.slug, episode.episode_id, saved);
    episode.quiz_config.intro_outro_snapshot = saved;
    return saved;
  });
}

export async function resolveEpisodeIntroOutro(repository: PairRepository, channel: Channel, episode: Episode) {
  const pinned = await pinIntroOutroSelection(repository, channel, episode);
  const snapshot = applyBookendEnablement(pinned, resolveBookendEnablement(episode.quiz_config));
  if (!snapshot.pair_id) return { snapshot, pair: null };
  const style = await repository.getChannelIntroOutroStyle(channel.channel_id, snapshot.pair_id);
  const pair = style ? await readyPair(repository, channel.channel_id, style) : null;
  if (!pair)
    throw new RepositoryError(
      "Pinned Intro/Outro pair is unavailable. Restore it or change the episode selection.",
      "INTRO_OUTRO_PAIR_UNAVAILABLE",
    );
  if ((await pairFingerprint(pair)) !== snapshot.fingerprint) {
    throw new RepositoryError("Pinned Intro/Outro media changed. Restore it or change the episode selection.", "INTRO_OUTRO_PAIR_CHANGED");
  }
  return { snapshot, pair };
}
