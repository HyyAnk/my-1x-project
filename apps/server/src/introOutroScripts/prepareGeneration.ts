import type { MascotStyleIdentityProfile } from "@studio/shared";
import type { ScriptGenerationJobInput, GenerationClipInput } from "./jobTypes.js";
import type { IntroOutroScriptRepository } from "./repository.js";
import { BUILT_IN_INTRO_OUTRO_SEEDS } from "./seedCatalog.js";
import { resolveSeedSelection } from "./seedSelection.js";

export async function prepareGenerationClips(
  scripts: IntroOutroScriptRepository,
  input: ScriptGenerationJobInput,
  identity: MascotStyleIdentityProfile,
): Promise<GenerationClipInput[]> {
  const catalog = [...BUILT_IN_INTRO_OUTRO_SEEDS, ...(await scripts.listCustomSeeds(input.channelId))];
  return input.clips.map((clip) => {
    const resolved = resolveSeedSelection({
      catalog,
      identity,
      clipKind: clip.clipKind,
      durationSeconds: clip.durationSeconds,
      randomizationSeed: "seedSelection" in clip ? clip.seedSelection.randomization_seed : clip.randomizationSeed,
      selectedSeedIds: "seedSelection" in clip ? clip.seedSelection.selected_seed_ids : clip.selectedSeedIds,
      lockedDimensions: "seedSelection" in clip ? clip.seedSelection.locked_dimensions : clip.lockedDimensions,
    });
    return {
      clipKind: clip.clipKind,
      durationSeconds: clip.durationSeconds,
      logoMode: clip.logoMode,
      seedSelection: resolved.selection,
      seeds: resolved.seeds,
    };
  });
}
