import { randomUUID } from "node:crypto";
import type { GenerateShortReelRequest, ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../../repository/service.js";
import { PackageServiceError, runPackageAttempt } from "../packageAttempt.js";
import { generateReelScript } from "../scriptService.js";
import { extractShortReelDisplayProjection, loadShortReelLocalizationArtifact } from "../../quiz/bank/localization/productLocalization.js";
import type { CompleteShortReelSourceSnapshot } from "../scriptPrompt.js";
import type { PlannedReelStage, ReelGenerationDependencies } from "../generation.types.js";
import type { ProgressEmitter } from "./stageTypes.js";

/**
 * Executes the script stage of short-reel generation.
 */
export async function executeScriptStage(
  repository: RepositoryService,
  key: ReelKey,
  initialRecord: ShortReelRecord,
  plan: PlannedReelStage[],
  request: GenerateShortReelRequest,
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<ShortReelRecord> {
  const scriptStage = plan.find((s) => s.stage === "script");
  if (!scriptStage) return initialRecord;

  if (dependencies.signal.aborted) {
    await emit("script", "cancelled", "Script generation cancelled.");
    throw new PackageServiceError("CANCELLED", "Script generation cancelled.");
  }

  if (scriptStage.action === "reuse") {
    await emit("script", "completed", "Reusing current script.", initialRecord.revision);
    return initialRecord;
  }

  await emit("script", "running", "Generating script...");
  const scriptOpId = `script-${randomUUID()}`;

  try {
    const updatedRecord = await runPackageAttempt(repository, key, "script", scriptOpId, async (snapshot) => {
      const localization = await loadShortReelLocalizationArtifact(repository, snapshot.channel_id, snapshot.reel_id);
      const displayProjection = extractShortReelDisplayProjection(snapshot.source, localization);

      if (request.target.startsWith("segment_")) {
        if (!snapshot.script) {
          throw new PackageServiceError("VALIDATION_FAILED", "Generate a complete script before regenerating one segment.");
        }
        const segIndex = Number(request.target.slice(-1)) as 1 | 2 | 3;
        const generated = await generateReelScript(
          {
            topic: snapshot.topic,
            source: snapshot.source as CompleteShortReelSourceSnapshot,
            displayProjection,
            mascotName: snapshot.visual_context?.mascot_name,
            artDirection: snapshot.visual_context?.art_direction,
          },
          dependencies.llmClient,
          { signal: dependencies.signal },
        );
        const replacement = generated.segments.find((s) => s.index === segIndex);
        if (!replacement) {
          throw new PackageServiceError("VALIDATION_FAILED", `Generated script omitted segment ${segIndex}.`);
        }
        const updatedSegments = snapshot.script.segments.map((s) => (s.index === segIndex ? replacement : s));
        return { script: { segments: updatedSegments } };
      }

      const generated = await generateReelScript(
        {
          topic: snapshot.topic,
          source: snapshot.source as CompleteShortReelSourceSnapshot,
          displayProjection,
          mascotName: snapshot.visual_context?.mascot_name,
          artDirection: snapshot.visual_context?.art_direction,
        },
        dependencies.llmClient,
        { signal: dependencies.signal },
      );
      return { script: generated };
    });

    await emit("script", "completed", "Script accepted.", updatedRecord.revision);
    return updatedRecord;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Script generation failed.";
    await emit("script", "failed", msg, initialRecord.revision);
    throw error;
  }
}
