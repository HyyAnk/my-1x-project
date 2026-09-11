import {
  type TransitionCatalogResponse,
  computeCatalogRevision,
  listTransitionDefinitions,
} from "@studio/shared";
import { SPECIMEN_SAMPLE_REVISION } from "../render/transitions/prepareTransitionSpecimen.js";

export function getTransitionCatalogSnapshot(
  sampleRevision: string = SPECIMEN_SAMPLE_REVISION,
): TransitionCatalogResponse {
  const revision = computeCatalogRevision();
  const entries = listTransitionDefinitions().map((def) => ({
    id: def.id,
    implementationRevision: def.implementationRevision,
    name: def.name,
    placements: def.placements,
    defaultDurationSeconds: def.defaultDurationSeconds,
    minDurationSeconds: def.minDurationSeconds,
    maxDurationSeconds: def.maxDurationSeconds,
    cssClass: def.cssClass,
  }));

  return {
    revision,
    sampleRevision,
    entries,
  };
}
