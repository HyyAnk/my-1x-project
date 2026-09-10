import { randomUUID } from "node:crypto";
import type { GenerateShortReelRequest, ReelKey, ShortReelRecord } from "@studio/shared";
import type { RepositoryService } from "../repository/service.js";
import { PackageServiceError, runPackageAttempt } from "./packageAttempt.js";
import { planReelGeneration } from "./generationPlan.js";
import { resolveMascotReference } from "./mascotReferenceService.js";
import { adoptVisualContext } from "./visualContextService.js";
import { generateReelScript } from "./scriptService.js";
import { generateReelStyleReferences } from "./styleImageService.js";
import { generateReelCoverPayload } from "./coverImageService.js";
import { generateReelPublishing } from "./publishingService.js";
import { extractShortReelDisplayProjection, loadShortReelLocalizationArtifact } from "../quiz/bank/localization/productLocalization.js";
import type { CompleteShortReelSourceSnapshot } from "./scriptPrompt.js";
import type { PlannedReelStage, ReelGenerationDependencies, ReelGenerationProgress, ReelGenerationStage } from "./generation.types.js";
import { GenerationError } from "./generationErrors.js";

type ProgressEmitter = (
  stage: ReelGenerationStage,
  state: ReelGenerationProgress["state"],
  message: string,
  recordRevision?: number,
) => Promise<void>;

async function validatePreflight(
  record: ShortReelRecord,
  plan: PlannedReelStage[],
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<void> {
  const willRunScript = plan.some((s) => s.stage === "script" && s.action === "run");
  const willRunPublishing = plan.some((s) => s.stage === "publishing" && s.action === "run");
  const willRunStyle = plan.some((s) => s.stage === "style" && s.action === "run");
  const willRunCover = plan.some((s) => s.stage === "cover" && s.action === "run");

  if (willRunScript || willRunPublishing) {
    if (!dependencies.llmClient) {
      await emit("preflight", "failed", "LLM client is not configured or unavailable.", record.revision);
      throw new PackageServiceError("VALIDATION_FAILED", "LLM client is not configured or unavailable.");
    }
  }

  if (willRunStyle || willRunCover) {
    if (!dependencies.imageClient) {
      await emit("preflight", "failed", "Image client is not configured or unavailable.", record.revision);
      throw new PackageServiceError("VALIDATION_FAILED", "Image generation client is not configured.");
    }
    if (!dependencies.imageClient.supportsReferenceImage) {
      await emit("preflight", "failed", "Configured image client does not support reference images.", record.revision);
      throw new PackageServiceError("VALIDATION_FAILED", "Configured image client does not support reference images.");
    }
  }

  await emit("preflight", "completed", "Prerequisites verified.", record.revision);
}

async function executeScriptStage(
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

async function executeStyleAndCoverBranch(
  repository: RepositoryService,
  key: ReelKey,
  plan: PlannedReelStage[],
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<void> {
  const styleStage = plan.find((s) => s.stage === "style");
  if (styleStage) {
    if (dependencies.signal.aborted) {
      await emit("style", "cancelled", "Style generation cancelled.");
      throw new PackageServiceError("CANCELLED", "Style generation cancelled.");
    }

    if (styleStage.action === "reuse") {
      const current = await repository.getShortReel(key);
      await emit("style", "completed", "Reusing current style references.", current.revision);
    } else {
      await emit("style", "running", "Generating style references...");
      const styleOpId = `style-${randomUUID()}`;
      try {
        const updated = await runPackageAttempt(repository, key, "references", styleOpId, async (snapshot) => {
          return generateReelStyleReferences(repository, key, snapshot, dependencies.imageClient, styleOpId, dependencies.signal);
        });
        await emit("style", "completed", "Style references accepted.", updated.revision);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Style generation failed.";
        await emit("style", "failed", msg);
        if (plan.some((s) => s.stage === "cover")) {
          await emit("cover", "skipped", "Cover generation skipped due to style generation failure.");
        }
        throw error;
      }
    }
  }

  const coverStage = plan.find((s) => s.stage === "cover");
  if (coverStage) {
    if (dependencies.signal.aborted) {
      await emit("cover", "cancelled", "Cover generation cancelled.");
      throw new PackageServiceError("CANCELLED", "Cover generation cancelled.");
    }

    if (coverStage.action === "reuse") {
      const current = await repository.getShortReel(key);
      await emit("cover", "completed", "Reusing current cover.", current.revision);
    } else {
      await emit("cover", "running", "Generating cover image...");
      const coverOpId = `cover-${randomUUID()}`;
      try {
        const updated = await runPackageAttempt(repository, key, "cover", coverOpId, async (snapshot) => {
          return generateReelCoverPayload(repository, key, snapshot, dependencies.imageClient, coverOpId, dependencies.signal);
        });
        await emit("cover", "completed", "Cover image accepted.", updated.revision);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Cover generation failed.";
        await emit("cover", "failed", msg);
        throw error;
      }
    }
  }
}

async function executePublishingBranch(
  repository: RepositoryService,
  key: ReelKey,
  plan: PlannedReelStage[],
  dependencies: ReelGenerationDependencies,
  emit: ProgressEmitter,
): Promise<void> {
  const publishingStage = plan.find((s) => s.stage === "publishing");
  if (!publishingStage) return;

  if (dependencies.signal.aborted) {
    await emit("publishing", "cancelled", "Publishing generation cancelled.");
    throw new PackageServiceError("CANCELLED", "Publishing generation cancelled.");
  }

  if (publishingStage.action === "reuse") {
    const current = await repository.getShortReel(key);
    await emit("publishing", "completed", "Reusing current publishing copy.", current.revision);
  } else {
    await emit("publishing", "running", "Generating publishing copy...");
    const pubOpId = `publishing-${randomUUID()}`;
    try {
      const updated = await runPackageAttempt(repository, key, "publishing", pubOpId, async (snapshot) => {
        const localization = await loadShortReelLocalizationArtifact(repository, key.channel_id, key.reel_id);
        return generateReelPublishing(snapshot, {
          llmClient: dependencies.llmClient,
          signal: dependencies.signal,
          localization,
        });
      });
      await emit("publishing", "completed", "Publishing copy accepted.", updated.revision);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Publishing generation failed.";
      await emit("publishing", "failed", msg);
      throw error;
    }
  }
}

function validateFinalDeliverables(finalRecord: ShortReelRecord): string[] {
  const validationErrors: string[] = [];
  if (
    !finalRecord.script ||
    finalRecord.units.script.state !== "ready" ||
    (finalRecord.stale_segments && finalRecord.stale_segments.length > 0)
  ) {
    validationErrors.push("Script is missing or has stale segments.");
  }

  const references = finalRecord.units.references.last_accepted_payload?.references ?? [];
  const mascotRefs = references.filter((r) => r.role === "mascot");
  const styleRefs = references.filter((r) => r.role === "style");
  if (finalRecord.units.references.state !== "ready" || mascotRefs.length !== 1 || styleRefs.length !== 1) {
    validationErrors.push("References must contain exactly one mascot and one style reference.");
  }

  if (!finalRecord.units.cover.last_accepted_payload || finalRecord.units.cover.state !== "ready") {
    validationErrors.push("Cover is missing or not ready.");
  }

  if (!finalRecord.units.publishing.last_accepted_payload || finalRecord.units.publishing.state !== "ready") {
    validationErrors.push("Publishing is missing or not ready.");
  }

  const compiledPrompts = finalRecord.units.script.last_accepted_payload?.compiled_prompts;
  if (!compiledPrompts || compiledPrompts.length !== 3) {
    validationErrors.push("Compiled prompts are missing or incomplete.");
  }

  return validationErrors;
}

/**
 * Orchestrates Short-Reel portrait-package generation adhering to the Dependency Matrix.
 * Owns ordering, runs atomic unit-attempt lifecycles, coordinates concurrent branches,
 * and emits structured durable stage progress.
 */
export async function executeReelGeneration(
  repository: RepositoryService,
  key: ReelKey,
  request: GenerateShortReelRequest,
  dependencies: ReelGenerationDependencies,
): Promise<ShortReelRecord> {
  const signal = dependencies.signal;
  if (signal.aborted) {
    throw new PackageServiceError("CANCELLED", "Generation cancelled before start.");
  }

  const emit: ProgressEmitter = async (stage, state, message, recordRevision) => {
    try {
      await dependencies.onProgress({ stage, state, message, recordRevision });
    } catch {
      // Progress listener failure must not derail generation
    }
  };

  await emit("preflight", "running", "Checking generation prerequisites...");

  const requiresVisualContext =
    request.target === "package" || request.target === "script" || request.target.startsWith("segment_") || request.target === "references";

  if (requiresVisualContext) {
    try {
      const visualContext = await resolveMascotReference(repository, key, signal);
      await adoptVisualContext(repository, key, visualContext);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Channel mascot master image is missing.";
      await emit("preflight", "failed", msg);
      if (error instanceof GenerationError || error instanceof PackageServiceError) {
        throw error;
      }
      throw new PackageServiceError("VALIDATION_FAILED", msg);
    }
  }

  const record = await repository.getShortReel(key);
  let plan: PlannedReelStage[];
  try {
    plan = planReelGeneration(record, request);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Validation failed during generation planning.";
    await emit("preflight", "failed", msg, record.revision);
    throw error;
  }

  await validatePreflight(record, plan, dependencies, emit);

  await executeScriptStage(repository, key, record, plan, request, dependencies, emit);

  const branchErrors: unknown[] = [];
  const branchResults = await Promise.allSettled([
    executeStyleAndCoverBranch(repository, key, plan, dependencies, emit),
    executePublishingBranch(repository, key, plan, dependencies, emit),
  ]);

  for (const result of branchResults) {
    if (result.status === "rejected") {
      branchErrors.push(result.reason);
    }
  }

  const finalizeStage = plan.find((s) => s.stage === "finalize");
  if (finalizeStage) {
    const finalRecord = await repository.getShortReel(key);

    if (signal.aborted) {
      await emit("finalize", "cancelled", "Finalization cancelled.", finalRecord.revision);
      throw new PackageServiceError("CANCELLED", "Generation cancelled.");
    }

    if (branchErrors.length > 0) {
      await emit("finalize", "failed", "Package incomplete: one or more stages failed.", finalRecord.revision);
      const first = branchErrors[0];
      if (first instanceof PackageServiceError) throw first;
      throw new PackageServiceError("ATTEMPT_FAILED", "Some package units failed. Successful units were preserved; retry failed units.");
    }

    await emit("finalize", "running", "Validating final package deliverables...", finalRecord.revision);
    const validationErrors = validateFinalDeliverables(finalRecord);

    if (validationErrors.length > 0) {
      await emit("finalize", "failed", `Partial completion: ${validationErrors.join(" ")}`, finalRecord.revision);
      throw new PackageServiceError("ATTEMPT_FAILED", `Package generation partially failed: ${validationErrors.join(" ")}`);
    }

    await emit("finalize", "completed", "Package complete.", finalRecord.revision);
    return finalRecord;
  }

  if (branchErrors.length > 0) {
    const first = branchErrors[0];
    if (first instanceof PackageServiceError) throw first;
    throw new PackageServiceError("ATTEMPT_FAILED", "Generation failed. Retry the affected unit.");
  }

  return repository.getShortReel(key);
}
