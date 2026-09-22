import type { CreativeSeed, IntroOutroClipKind, IntroOutroScriptProject } from "@studio/shared";
import { BUILT_IN_INTRO_OUTRO_SEEDS, latestSeedCatalog } from "../../introOutroScripts/seedCatalog.js";
import { IntroOutroScriptError } from "../../introOutroScripts/errors.js";
import type { IntroOutroScriptRepository } from "../../introOutroScripts/repository.js";

export async function loadSeedCatalog(
  scripts: IntroOutroScriptRepository,
  channelId: string,
): Promise<{ all: CreativeSeed[]; latest: CreativeSeed[] }> {
  const all = [...BUILT_IN_INTRO_OUTRO_SEEDS, ...(await scripts.listCustomSeeds(channelId))];
  return { all, latest: latestSeedCatalog(all) };
}

export async function resolveDraftSeedSnapshot(input: {
  scripts: IntroOutroScriptRepository;
  project: IntroOutroScriptProject;
  clipKind: IntroOutroClipKind;
  catalog: CreativeSeed[];
}): Promise<CreativeSeed[]> {
  const draft = input.project.drafts[input.clipKind];
  const selectedIds = draft.seed_selection?.selected_seed_ids ?? [];
  if (!selectedIds.length) throw new IntroOutroScriptError("Select creative seeds first", "SEED_COMBINATION_INVALID");

  if (draft.source_revision_id) {
    const source = await input.scripts
      .getRevision(input.project.channel_id, input.project.project_id, draft.source_revision_id)
      .catch(() => null);
    if (source && source.clip_kind === input.clipKind && selectedIds.every((id) => source.seed_selection.selected_seed_ids.includes(id))) {
      return source.seed_snapshot;
    }
  }

  const byId = new Map(input.catalog.map((seed) => [seed.id, seed]));
  const seeds = selectedIds.map((id) => byId.get(id)).filter((seed): seed is CreativeSeed => Boolean(seed));
  if (seeds.length !== selectedIds.length) {
    throw new IntroOutroScriptError("One or more selected seeds are unavailable", "SEED_COMBINATION_INVALID");
  }
  return seeds;
}
