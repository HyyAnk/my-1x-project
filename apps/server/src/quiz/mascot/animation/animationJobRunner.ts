import fs from "node:fs/promises";
import path from "node:path";
import type { MascotAnimationAssetV1, MascotAnimationJob } from "@studio/shared";
import { AnimationImportError, importAnimationArtifacts } from "./animationArtifactImporter.js";
import type { AnimationRepository } from "./animationRepositoryTypes.js";
import type { SpriteGenAdapter } from "./spriteGen/spriteGenAdapter.js";

export interface AnimationJobRunnerOptions {
  repository: AnimationRepository;
  adapter: SpriteGenAdapter;
  outputBaseDir: string;
  prompt: string;
  styleAnchorPath: string;
  fixtureMode?: boolean;
  signal?: AbortSignal;
}

export async function runAnimationJob(
  job: MascotAnimationJob,
  options: AnimationJobRunnerOptions,
): Promise<{ job: MascotAnimationJob; asset?: MascotAnimationAssetV1 }> {
  const { repository, adapter, signal } = options;

  // Immediate cancellation check
  if (signal?.aborted) {
    const cancelledJob = await repository.saveJob({
      ...job,
      status: "cancelled",
      error_message: "Job cancelled before starting",
      updated_at: new Date().toISOString(),
    });
    return { job: cancelledJob };
  }

  // 1. Transition queued -> generating and record attempt start
  const { job: _runningJob, attempt } = await repository.recordAttemptStart(job.mascot_id, job.id, job.fingerprint);

  const attemptDir = path.join(
    options.outputBaseDir,
    job.mascot_id,
    job.style_id,
    job.state,
    String(job.slot_index),
    `attempt_${attempt.attempt_number}`,
  );
  await fs.mkdir(attemptDir, { recursive: true });

  // 2. Execute sprite-gen adapter
  try {
    await adapter.execute({
      jobId: job.id,
      mascotId: job.mascot_id,
      styleId: job.style_id,
      state: job.state,
      slot: job.slot_index,
      recipeId: job.recipe_id,
      prompt: options.prompt,
      styleAnchorPath: options.styleAnchorPath,
      outputDir: attemptDir,
      sourceFingerprint: job.fingerprint,
      attempt: attempt.attempt_number,
      fixtureMode: options.fixtureMode,
      signal,
    });
  } catch (err: unknown) {
    const isAborted = signal?.aborted || (err as Error).name === "AbortError";
    const status = isAborted ? "cancelled" : "error";
    const message = isAborted ? "Job execution was cancelled" : (err as Error).message;

    try {
      const failedJob = await repository.updateAttempt(job.mascot_id, job.id, attempt.attempt_number, {
        status,
        completed_at: new Date().toISOString(),
        error_message: message,
      });
      return { job: failedJob };
    } catch (attemptErr) {
      if (isAborted) {
        const currentJob = await repository.getJob(job.mascot_id, job.id);
        if (currentJob && currentJob.status === "cancelled") {
          return { job: currentJob };
        }
      }
      throw attemptErr;
    }
  }

  if (signal?.aborted) {
    try {
      const cancelledJob = await repository.updateAttempt(job.mascot_id, job.id, attempt.attempt_number, {
        status: "cancelled",
        completed_at: new Date().toISOString(),
        error_message: "Job execution was cancelled after generation",
      });
      return { job: cancelledJob };
    } catch (attemptErr) {
      const currentJob = await repository.getJob(job.mascot_id, job.id);
      if (currentJob && currentJob.status === "cancelled") {
        return { job: currentJob };
      }
      throw attemptErr;
    }
  }

  // 3. Transition generating -> curating
  await repository.updateAttempt(job.mascot_id, job.id, attempt.attempt_number, {
    status: "curating",
  });

  // 4. Import artifacts, validate manifest and QA
  let asset: MascotAnimationAssetV1;
  try {
    asset = await importAnimationArtifacts(attemptDir, {
      mascotId: job.mascot_id,
      styleId: job.style_id,
      state: job.state,
      slotIndex: job.slot_index,
      recipeId: job.recipe_id,
      sourceFingerprint: job.fingerprint,
    });
  } catch (err: unknown) {
    const isQaFailure = err instanceof AnimationImportError && err.code === "QA_FAILED";
    const status = isQaFailure ? "qa_failed" : "error";
    const message = (err as Error).message;

    const failedJob = await repository.updateAttempt(job.mascot_id, job.id, attempt.attempt_number, {
      status,
      completed_at: new Date().toISOString(),
      error_message: message,
    });
    return { job: failedJob };
  }

  // 5. Transition curating -> ready and publish
  const readyJob = await repository.updateAttempt(job.mascot_id, job.id, attempt.attempt_number, {
    status: "ready",
    completed_at: new Date().toISOString(),
    error_message: null,
  });

  await repository.publishSlotAnimation(job.mascot_id, job.style_id, job.state, job.slot_index, asset);

  // Expose latest artifacts at the slot directory level for fast direct resolution
  try {
    const slotDir = path.join(options.outputBaseDir, job.mascot_id, job.style_id, job.state, String(job.slot_index));
    await fs.copyFile(path.join(attemptDir, "atlas.png"), path.join(slotDir, "atlas.png"));
    await fs.copyFile(path.join(attemptDir, "manifest.json"), path.join(slotDir, "manifest.json"));
    const qaReportSrc = path.join(attemptDir, "qa_report.json");
    if (
      await fs
        .access(qaReportSrc)
        .then(() => true)
        .catch(() => false)
    ) {
      await fs.copyFile(qaReportSrc, path.join(slotDir, "qa_report.json"));
    }
  } catch {
    // Non-blocking cache sync
  }

  return { job: readyJob, asset };
}
