import type { TransitionPreviewRequest } from "@studio/shared";
import {
  resolveRenderEngineSnapshot,
  type RenderEngineSnapshot,
} from "../../tasks/video/renderEngineSnapshot.js";
import { prepareTransitionSpecimen } from "../render/transitions/prepareTransitionSpecimen.js";
import {
  buildTransitionSpecimen,
  type BuiltTransitionSpecimen,
} from "../render/transitions/buildTransitionSpecimen.js";
import { fingerprintTransitionPreview } from "./transitionPreviewFingerprint.js";

export interface PreparedTransitionSpecimenData {
  specimen: BuiltTransitionSpecimen;
  snapshot: RenderEngineSnapshot;
  fingerprint: string;
}

export function buildTransitionPreviewSpecimen(options: {
  request: TransitionPreviewRequest;
  currentCatalogRevision: string;
  definitionId: string;
  definitionRevision: string;
}): PreparedTransitionSpecimenData {
  const prepared = prepareTransitionSpecimen({
    selection: options.request.selection,
    source: options.request.source,
  });
  const specimen = buildTransitionSpecimen(prepared);
  const snapshot = resolveRenderEngineSnapshot();
  const fingerprint = fingerprintTransitionPreview({
    catalogRevision: options.currentCatalogRevision,
    engineSnapshotHash: snapshot.snapshotHash,
    aspectRatio: prepared.aspectRatio as "16:9" | "9:16",
    width: prepared.width,
    height: prepared.height,
    fps: prepared.fps,
    quality: "standard",
    resolvedInstances: [specimen.resolvedInstance],
    definitionHashes: {
      [options.definitionId]: options.definitionRevision,
    },
    compositionHtml: specimen.html,
    compositionFiles: specimen.files,
    sourceKind: "sample",
    boundaryId: specimen.boundaryId,
  });

  return { specimen, snapshot, fingerprint };
}
