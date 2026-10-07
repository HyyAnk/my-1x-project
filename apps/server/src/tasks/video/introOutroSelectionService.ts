import type { Channel, Episode, IntroOutroStyle, IntroOutroSnapshot } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { resolveEpisodeIntroOutro } from "../../quiz/introOutro/episodeSelection.js";

export type IntroOutroSelectionSource = "style_builtin" | "motion_template" | "specific_pair" | "legacy_default" | "none";
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
  if (episode.quiz_config.intro_outro_selection.mode === "motion_template") {
    return {
      snapshot: {
        version: 1,
        selection_key: "motion_template",
        resolved_visual_style: episode.quiz_config.resolved_visual_style,
        style_preset_id: "motion_template",
        pair_id: null,
        fingerprint: null,
        intro_duration_seconds: 0,
        outro_duration_seconds: 0,
        selected_at: new Date().toISOString(),
        intro_has_audio: false,
        outro_has_audio: false,
      },
      source: "motion_template",
    };
  }
  const { snapshot, pair } = await resolveEpisodeIntroOutro(repository, channel, episode);
  return {
    snapshot,
    source: pair ? episode.quiz_config.intro_outro_selection.mode : "none",
    stylePresetId: snapshot.style_preset_id,
    ...pair,
  };
}
