import type { IntroOutroClipKind, IntroOutroScriptJob } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import type { RepositoryService } from "../repository.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { resolveIntroOutroContext } from "./contextResolver.js";
import { describeScriptError, IntroOutroScriptError } from "./errors.js";
import { analyzeMascotStyleIdentity } from "./identityAnalyzer.js";
import type { ScriptGenerationJobInput } from "./jobTypes.js";
import type { IntroOutroScriptRepository } from "./repository.js";
import { retainContextReferenceSnapshots } from "./revisionService.js";
import { generateIntroOutroScript } from "./scriptGenerator.js";

export class IntroOutroScriptJobExecutor {
  constructor(
    private readonly repository: RepositoryService,
    private readonly scripts: IntroOutroScriptRepository,
    private readonly client: LLMClient | null,
    private readonly model: string,
    private readonly logger: StudioLogger,
  ) {}

  async analyzeIdentity(input: {
    job: IntroOutroScriptJob;
    stylePresetId: string;
    mascotStyleId?: string;
    signal: AbortSignal;
  }): Promise<Partial<IntroOutroScriptJob>> {
    if (!this.client) throw new IntroOutroScriptError("Antigravity is unavailable", "LLM_UNAVAILABLE");
    const context = await resolveIntroOutroContext({
      repository: this.repository,
      scripts: this.scripts,
      channelId: input.job.channel_id,
      stylePresetId: input.stylePresetId,
      mascotStyleId: input.mascotStyleId,
    });
    const profile = await analyzeMascotStyleIdentity({
      client: this.client,
      context,
      model: this.model,
      signal: input.signal,
    });
    await this.scripts.saveIdentityProfile(profile);
    return { status: "succeeded", step: "Identity analysis ready for review" };
  }

  async generate(job: IntroOutroScriptJob, input: ScriptGenerationJobInput, signal: AbortSignal): Promise<Partial<IntroOutroScriptJob>> {
    if (!this.client) throw new IntroOutroScriptError("Antigravity is unavailable", "LLM_UNAVAILABLE");
    const context = await resolveIntroOutroContext({
      repository: this.repository,
      scripts: this.scripts,
      channelId: input.channelId,
      stylePresetId: input.stylePresetId,
      mascotStyleId: input.mascotStyleId,
    });
    if (!context.identity || context.publicContext.identity_status !== "reviewed") {
      throw new IntroOutroScriptError("Review the current mascot style identity before generating scripts", "IDENTITY_REVIEW_REQUIRED");
    }
    await retainContextReferenceSnapshots({
      scripts: this.scripts,
      context,
      channelId: input.channelId,
      projectId: input.projectId,
    });

    const existingRevisions = await this.scripts.listRevisions(input.channelId, input.projectId);
    const resultIds: string[] = [];
    const failedKinds: IntroOutroClipKind[] = [];
    const clipErrors: IntroOutroScriptJob["clip_errors"] = [];
    let expectedVersion = input.projectVersion;
    const project = await this.scripts.getProject(input.channelId, input.projectId);
    let companionContent =
      input.clips.length === 1 ? (project.drafts[input.clips[0].clipKind === "intro" ? "outro" : "intro"].content ?? undefined) : undefined;
    if (companionContent?.identity.profile_id !== context.identity.profile_id || !companionContent?.production_directions)
      companionContent = undefined;

    for (const clip of input.clips) {
      if (signal.aborted) throw new IntroOutroScriptError("Generation cancelled", "GENERATION_CANCELLED");
      await this.updateStep(job, `Generating ${clip.clipKind} script`);
      try {
        const revision = await generateIntroOutroScript({
          client: this.client,
          context,
          identity: context.identity,
          model: this.model,
          projectId: input.projectId,
          revisionNumber: existingRevisions.filter((item) => item.clip_kind === clip.clipKind).length + 1,
          clipKind: clip.clipKind,
          durationSeconds: clip.durationSeconds,
          seedSelection: clip.seedSelection,
          seeds: clip.seeds,
          signal,
          companionContent,
          onProgress: (step) => this.updateStep(job, step),
        });
        signal.throwIfAborted();
        const appended = await this.scripts.appendRevision(input.channelId, revision, expectedVersion);
        companionContent = revision.content;
        if (appended.draftUpdated) expectedVersion = appended.project.version;
        resultIds.push(revision.revision_id);
      } catch (error) {
        failedKinds.push(clip.clipKind);
        const details = describeScriptError(error);
        clipErrors.push({ clip_kind: clip.clipKind, code: details.code, message: details.message });
        this.logger.warn(`Intro/outro ${clip.clipKind} generation failed: ${details.message}`, {
          step: "intro_outro_script_generation",
          workerId: job.job_id,
          channelId: input.channelId,
          errorCode: details.code,
        });
      }
    }

    const status = resultIds.length === input.clips.length ? "succeeded" : resultIds.length ? "partial" : "failed";
    return {
      status,
      step: status === "succeeded" ? "Scripts ready for review" : status === "partial" ? "Some scripts need retry" : "Generation failed",
      result_revision_ids: resultIds,
      failed_clip_kinds: failedKinds,
      clip_errors: clipErrors,
      ...(status === "failed"
        ? {
            error_code: clipErrors[0]?.code ?? "SCRIPT_GENERATION_FAILED",
            error_message: clipErrors[0]?.message ?? "No requested script could be generated.",
          }
        : {}),
    };
  }

  private async updateStep(job: IntroOutroScriptJob, step: string): Promise<void> {
    const current = await this.scripts.getJob(job.channel_id, job.job_id);
    await this.scripts.saveJob({ ...current, step });
  }
}
