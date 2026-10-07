import type { CreativeSeed, CreativeSeedDimension, IntroOutroClipKind, MascotCapabilityId } from "@studio/shared";

export type SeedDefinition = [id: string, name: string, intent: string, requirements?: MascotCapabilityId[]];

export function buildSeedsFromDefinitions(
  definitions: Record<string, SeedDefinition[]>,
  clipKind: IntroOutroClipKind,
  mediumComplexityIds: ReadonlySet<string>,
): CreativeSeed[] {
  return Object.entries(definitions).flatMap(([rawDimension, seeds]) => {
    const dimension = rawDimension as CreativeSeedDimension;
    return seeds.map(([id, name, narrative_intent, required_capabilities = []]) => ({
      id,
      revision: 3,
      dimension,
      clip_kind: clipKind,
      name,
      narrative_intent,
      required_capabilities,
      style_tags: [],
      allowed_props: [],
      allowed_text: [],
      forbidden_seed_ids: [],
      complexity: mediumComplexityIds.has(id) ? "medium" : "low",
      selection_weight: 1,
      origin: "built_in" as const,
      status: "active" as const,
    }));
  });
}
