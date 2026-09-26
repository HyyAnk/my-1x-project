import type { IntroOutroScriptJob } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import type { RepositoryService } from "../repository.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import { resolveIntroOutroContext } from "./contextResolver.js";
import { IntroOutroScriptError } from "./errors.js";
import { analyzeMascotStyleIdentity } from "./identityAnalyzer.js";
import type { ScriptGenerationJobInput } from "./jobTypes.js";
import type { IntroOutroScriptRepository } from "./repository.js";
import { retainContextReferenceSnapshots } from "./revisionService.js";
import { generateIntroOutroScripts } from "./scriptGenerator.js";
import { GenerationResults } from "./generationResults.js";
import { prepareAutomaticIdentity } from "./automaticIdentity.js";
import { prepareGenerationClips } from "./prepareGeneration.js";

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
    const context = await prepareAutomaticIdentity({
      repository: this.repository,
      scripts: this.scripts,
      client: this.client,
      model: this.model,
      signal,
      force: input.autoIdentity === false,
      onProgress: (step) => this.updateStep(job, step),
      channelId: input.channelId,
      stylePresetId: input.stylePresetId,
      mascotStyleId: input.mascotStyleId,
    });
    const clips = await prepareGenerationClips(this.scripts, input, context.identity);
    await retainContextReferenceSnapshots({
      scripts: this.scripts,
      context,
      channelId: input.channelId,
      projectId: input.projectId,
    });

    const existingRevisions = await this.scripts.listRevisions(input.channelId, input.projectId);
    const project = await this.scripts.getProject(input.channelId, input.projectId);
    let companionContent =
      input.clips.length === 1 ? (project.drafts[input.clips[0].clipKind === "intro" ? "outro" : "intro"].content ?? undefined) : undefined;
    if (companionContent?.identity.profile_id !== context.identity.profile_id || !companionContent?.production_directions)
      companionContent = undefined;

    const startedAt = Date.now();
    const results = new GenerationResults(this.repository, this.scripts, job, input, context, signal);
    await generateIntroOutroScripts({
      client: this.client,
      context,
      identity: context.identity,
      model: this.model,
      projectId: input.projectId,
      clips: clips.map((clip) => ({
        ...clip,
        revisionNumber: existingRevisions.filter((item) => item.clip_kind === clip.clipKind).length + 1,
      })),
      signal,
      companionContent,
      onProgress: (step) => this.updateStep(job, step),
      onResult: (result) => results.accept(result),
    });
    const finished = results.finish();
    this.logger.info("Independent script generation completed", {
      step: "intro_outro_script_generation",
      workerId: job.job_id,
      channelId: input.channelId,
      elapsedMs: Date.now() - startedAt,
      generationCalls: clips.length,
      reviewCalls: 0,
      automaticRepairs: 0,
      saved: finished.result_revision_ids?.length,
      failed: finished.failed_clip_kinds?.length,
    });
    return finished;
  }

  private async updateStep(job: IntroOutroScriptJob, step: string): Promise<void> {
    await this.scripts.withLock(`job-progress:${job.job_id}`, async () => {
      const current = await this.scripts.getJob(job.channel_id, job.job_id);
      if (current.status === "running") await this.scripts.saveJob({ ...current, step });
    });
  }
}
