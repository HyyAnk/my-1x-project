import fs from "node:fs/promises";
import path from "node:path";
import {
  MascotAnimationBatchSchema,
  MascotAnimationJobSchema,
  type MascotAnimationAttempt,
  type MascotAnimationBatch,
  type MascotAnimationJob,
} from "@studio/shared";
import { writeJsonAtomic } from "../../../utils/fs.js";
import { JobNotFoundError, StaleAttemptError } from "./animationRepositoryTypes.js";

function getJobsDir(storageRoot: string, mascotId: string): string {
  return path.join(storageRoot, "mascots", mascotId, "animation_jobs");
}

function getBatchesDir(storageRoot: string, mascotId: string): string {
  return path.join(storageRoot, "mascots", mascotId, "animation_batches");
}

export async function saveJobToDisk(storageRoot: string, job: MascotAnimationJob): Promise<MascotAnimationJob> {
  const validated = MascotAnimationJobSchema.parse(job);
  const filePath = path.join(getJobsDir(storageRoot, validated.mascot_id), `${validated.id}.json`);
  await writeJsonAtomic(filePath, validated);
  return validated;
}

export async function getJobFromDisk(storageRoot: string, mascotId: string, jobId: string): Promise<MascotAnimationJob | null> {
  const filePath = path.join(getJobsDir(storageRoot, mascotId), `${jobId}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return MascotAnimationJobSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function listJobsByStyleFromDisk(storageRoot: string, mascotId: string, styleId: string): Promise<MascotAnimationJob[]> {
  const dir = getJobsDir(storageRoot, mascotId);
  try {
    const entries = await fs.readdir(dir);
    const jobs: MascotAnimationJob[] = [];

    for (const file of entries.filter((e) => e.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf8");
        const parsed = MascotAnimationJobSchema.parse(JSON.parse(raw));
        if (parsed.style_id === styleId) {
          jobs.push(parsed);
        }
      } catch {
        // Skip unparseable
      }
    }

    return jobs.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch {
    return [];
  }
}

export async function listJobsByBatchFromDisk(storageRoot: string, mascotId: string, batchId: string): Promise<MascotAnimationJob[]> {
  const dir = getJobsDir(storageRoot, mascotId);
  try {
    const entries = await fs.readdir(dir);
    const jobs: MascotAnimationJob[] = [];

    for (const file of entries.filter((e) => e.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf8");
        const parsed = MascotAnimationJobSchema.parse(JSON.parse(raw));
        if (parsed.batch_id === batchId) {
          jobs.push(parsed);
        }
      } catch {
        // Skip unparseable
      }
    }

    return jobs.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch {
    return [];
  }
}

export async function saveBatchToDisk(storageRoot: string, batch: MascotAnimationBatch): Promise<MascotAnimationBatch> {
  const validated = MascotAnimationBatchSchema.parse(batch);
  const filePath = path.join(getBatchesDir(storageRoot, validated.mascot_id), `${validated.id}.json`);
  await writeJsonAtomic(filePath, validated);
  return validated;
}

export async function getBatchFromDisk(storageRoot: string, mascotId: string, batchId: string): Promise<MascotAnimationBatch | null> {
  const filePath = path.join(getBatchesDir(storageRoot, mascotId), `${batchId}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return MascotAnimationBatchSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function recordAttemptStartInStore(
  storageRoot: string,
  mascotId: string,
  jobId: string,
  fingerprint: string,
): Promise<{ job: MascotAnimationJob; attempt: MascotAnimationAttempt }> {
  const job = await getJobFromDisk(storageRoot, mascotId, jobId);
  if (!job) {
    throw new JobNotFoundError(jobId);
  }

  const highestAttempt = job.attempts && job.attempts.length > 0 ? Math.max(...job.attempts.map((a) => a.attempt_number)) : 0;
  const nextAttemptNumber = highestAttempt + 1;

  const attempt: MascotAnimationAttempt = {
    attempt_number: nextAttemptNumber,
    status: "generating",
    fingerprint,
    started_at: new Date().toISOString(),
    logs: [],
  };

  const updatedJob: MascotAnimationJob = {
    ...job,
    status: "generating",
    current_attempt: nextAttemptNumber,
    attempts: [...(job.attempts || []), attempt],
    updated_at: new Date().toISOString(),
  };

  await saveJobToDisk(storageRoot, updatedJob);
  return { job: updatedJob, attempt };
}

export async function updateAttemptInStore(
  storageRoot: string,
  mascotId: string,
  jobId: string,
  attemptNumber: number,
  patch: Partial<MascotAnimationAttempt>,
): Promise<MascotAnimationJob> {
  const job = await getJobFromDisk(storageRoot, mascotId, jobId);
  if (!job) {
    throw new JobNotFoundError(jobId);
  }

  const attempts = job.attempts || [];
  const highestAttempt = attempts.length > 0 ? Math.max(...attempts.map((a) => a.attempt_number)) : 0;

  // Stale attempt rejection: reject updates if a newer attempt is already in progress or completed
  if (attemptNumber < highestAttempt) {
    throw new StaleAttemptError(`Update rejected for stale attempt ${attemptNumber}. Current active attempt is ${highestAttempt}.`);
  }

  const targetIndex = attempts.findIndex((a) => a.attempt_number === attemptNumber);
  if (targetIndex === -1) {
    throw new StaleAttemptError(`Attempt ${attemptNumber} does not exist in job ${jobId}`);
  }

  const updatedAttempts = [...attempts];
  const targetAttempt = updatedAttempts[targetIndex];
  updatedAttempts[targetIndex] = {
    ...targetAttempt,
    ...patch,
  };

  const updatedJob: MascotAnimationJob = {
    ...job,
    attempts: updatedAttempts,
    status: patch.status ?? job.status,
    error_message: patch.error_message !== undefined ? patch.error_message : job.error_message,
    updated_at: new Date().toISOString(),
  };

  await saveJobToDisk(storageRoot, updatedJob);
  return updatedJob;
}
