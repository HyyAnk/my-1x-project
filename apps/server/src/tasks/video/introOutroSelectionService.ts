import type { Channel, Episode, IntroOutroStyle, IntroOutroSnapshot } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { resolveEpisodeIntroOutro } from "../../quiz/introOutro/episodeSelection.js";

export type IntroOutroSelectionSource = "style_builtin" | "specific_pair" | "legacy_default" | "none";
export type ResolvedIntroOutroPair = {
  snapshot: IntroOutroSnapshot;
  source: IntroOutroSelectionSource;
  stylePresetId?: string;
  style?: IntroOutroStyle;
  introSourcePath?: string;
  outroSourcePath?: string;
  unavailableReason?: string;
};

export async function selectIntroOutroPair(
  repository: RepositoryService,
  channel: Channel,
  episode: Episode,
  _taskId: string,
): Promise<ResolvedIntroOutroPair> {
  const { snapshot, pair } = await resolveEpisodeIntroOutro(repository, channel, episode);
  return {
    snapshot,
    source: pair ? episode.quiz_config.intro_outro_selection.mode : "none",
    stylePresetId: snapshot.style_preset_id,
    ...pair,
  };
}
