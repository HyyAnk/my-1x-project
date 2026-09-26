import type { IntroOutroScriptJob } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import type { RepositoryService } from "../repository.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { IntroOutroScriptError } from "./errors.js";
import { fingerprint } from "./fingerprint.js";
import { IntroOutroScriptJobExecutor } from "./jobExecutor.js";
import { IntroOutroJobLifecycle } from "./jobLifecycle.js";
import type { ScriptGenerationJobInput } from "./jobTypes.js";
import type { IntroOutroScriptRepository } from "./repository.js";

export class IntroOutroScriptJobManager {
  private readonly executor: IntroOutroScriptJobExecutor;
  private readonly lifecycle: IntroOutroJobLifecycle;

  constructor(
    repository: RepositoryService,
    private readonly scripts: IntroOutroScriptRepository,
    client: LLMClient | null,
    model: string,
    logger: StudioLogger,
  ) {
    this.executor = new IntroOutroScriptJobExecutor(repository, scripts, client, model, logger);
    this.lifecycle = new IntroOutroJobLifecycle(repository, scripts);
  }

  initialize(): Promise<void> {
    return this.lifecycle.initialize();
  }

  async startIdentityAnalysis(input: {
    channelId: string;
    stylePresetId: string;
    mascotStyleId?: string;
    idempotencyKey: string;
  }): Promise<IntroOutroScriptJob> {
    const requestFingerprint = fingerprint({
      stylePresetId: input.stylePresetId,
      mascotStyleId: input.mascotStyleId ?? null,
    });
    const existing = await this.lifecycle.findReusable(input.channelId, input.idempotencyKey, "identity_analysis", requestFingerprint);
    if (existing) return existing;
    const job = await this.lifecycle.create({
      channelId: input.channelId,
      projectId: null,
      type: "identity_analysis",
      requestedClipKinds: [],
      projectVersion: null,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint,
    });
    this.lifecycle.launch(job, "Inspecting mascot style reference", (signal) =>
      this.executor.analyzeIdentity({
        job,
        stylePresetId: input.stylePresetId,
        mascotStyleId: input.mascotStyleId,
        signal,
      }),
    );
    return job;
  }

  async startScriptGeneration(input: ScriptGenerationJobInput): Promise<IntroOutroScriptJob> {
    return this.scripts.withLock(`generation:${input.channelId}`, () => this.startGenerationLocked(input));
  }

  private async startGenerationLocked(input: ScriptGenerationJobInput): Promise<IntroOutroScriptJob> {
    const requestFingerprint = fingerprint({
      projectId: input.projectId,
      stylePresetId: input.stylePresetId,
      mascotStyleId: input.mascotStyleId ?? null,
      projectVersion: input.projectVersion,
      clips: input.clips,
      autoIdentity: input.autoIdentity ?? true,
    });
    const existing = await this.lifecycle.findReusable(input.channelId, input.idempotencyKey, "script_generation", requestFingerprint);
    if (existing) return existing;
    await this.assertGenerationCanStart(input);
    const job = await this.lifecycle.create({
      channelId: input.channelId,
      projectId: input.projectId,
      type: "script_generation",
      requestedClipKinds: input.clips.map((clip) => clip.clipKind),
      projectVersion: input.projectVersion,
      idempotencyKey: input.idempotencyKey,
      requestFingerprint,
    });
    this.lifecycle.launch(job, "Resolving reviewed mascot context", (signal) => this.executor.generate(job, input, signal));
    return job;
  }

  cancel(channelId: string, jobId: string): Promise<IntroOutroScriptJob> {
    return this.lifecycle.cancel(channelId, jobId);
  }

  listActiveJobs(channelId: string): Promise<IntroOutroScriptJob[]> {
    return this.lifecycle.listActiveJobs(channelId);
  }

  private async assertGenerationCanStart(input: ScriptGenerationJobInput): Promise<void> {
    const currentProject = await this.scripts.getProject(input.channelId, input.projectId);
    if (currentProject.archived) throw new IntroOutroScriptError("This pair draft is archived. Open New Pair again.", "VERSION_CONFLICT");
    if (currentProject.version !== input.projectVersion) {
      throw new IntroOutroScriptError("This script changed. Reload it before generation.", "VERSION_CONFLICT");
    }
    const requestedKinds = new Set(input.clips.map((clip) => clip.clipKind));
    const conflictingJob = (await this.scripts.listJobs(input.channelId)).find(
      (candidate) =>
        candidate.project_id === input.projectId &&
        (candidate.status === "queued" || candidate.status === "running") &&
        candidate.requested_clip_kinds.some((kind) => requestedKinds.has(kind)),
    );
    if (conflictingJob) {
      throw new IntroOutroScriptError("A generation job is already active for the selected clip", "JOB_ALREADY_RUNNING");
    }
  }
}
