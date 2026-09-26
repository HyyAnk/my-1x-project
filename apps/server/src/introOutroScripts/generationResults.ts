import type { IntroOutroScriptJob } from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import type { IntroOutroScriptRepository } from "./repository.js";
import type { ResolvedIntroOutroContext } from "./contextResolver.js";
import { resolveIntroOutroContext } from "./contextResolver.js";
import type { ScriptGenerationJobInput } from "./jobTypes.js";
import type { ScriptGenerationResult } from "./generation.types.js";
import { describeScriptError, IntroOutroScriptError } from "./errors.js";

export class GenerationResults {
  private expectedVersion: number;
  private readonly results: string[] = [];
  private readonly errors: IntroOutroScriptJob["clip_errors"] = [];

  constructor(
    private readonly repository: RepositoryService,
    private readonly scripts: IntroOutroScriptRepository,
    private readonly job: IntroOutroScriptJob,
    private readonly input: ScriptGenerationJobInput,
    private readonly context: ResolvedIntroOutroContext,
    private readonly signal: AbortSignal,
  ) {
    this.expectedVersion = input.projectVersion;
  }

  async accept(result: ScriptGenerationResult): Promise<void> {
    await this.scripts.withLock(`job-progress:${this.job.job_id}`, async () => {
      this.signal.throwIfAborted();
      const current = await this.scripts.getJob(this.job.channel_id, this.job.job_id);
      if (current.status !== "running") return;
      try {
        if (!result.revision) throw result.error;
        await this.assertCurrentReference();
        this.signal.throwIfAborted();
        const saved = await this.scripts.appendRevision(this.input.channelId, result.revision, this.expectedVersion);
        if (saved.draftUpdated) this.expectedVersion = saved.project.version;
        this.results.push(result.revision.revision_id);
      } catch (error) {
        this.signal.throwIfAborted();
        this.errors.push({ clip_kind: result.clipKind, ...describeScriptError(error) });
      }
      const count = this.results.length + this.errors.length;
      await this.scripts.saveJob({ ...current, ...this.progress(), step: `${count}/${this.input.clips.length} scripts processed` });
    });
  }

  private async assertCurrentReference(): Promise<void> {
    const latest = await resolveIntroOutroContext({
      repository: this.repository,
      scripts: this.scripts,
      channelId: this.input.channelId,
      stylePresetId: this.input.stylePresetId,
      mascotStyleId: this.input.mascotStyleId,
    });
    if (
      latest.mascotReference.sha256 !== this.context.mascotReference.sha256 ||
      latest.style.id !== this.context.style.id ||
      latest.style.style_revision !== this.context.style.style_revision ||
      latest.logoReference?.sha256 !== this.context.logoReference?.sha256
    )
      throw new IntroOutroScriptError(
        "Reference assets changed during generation. Retry with the current references.",
        "IDENTITY_PROFILE_STALE",
      );
  }

  private progress() {
    return {
      result_revision_ids: [...this.results],
      failed_clip_kinds: this.errors.map((error) => error.clip_kind),
      clip_errors: [...this.errors],
    };
  }

  finish(): Partial<IntroOutroScriptJob> {
    const status = this.results.length === this.input.clips.length ? "succeeded" : this.results.length ? "partial" : "failed";
    return {
      ...this.progress(),
      status,
      step: status === "succeeded" ? "Scripts ready" : status === "partial" ? "Some scripts need retry" : "Generation failed",
      ...(status === "failed"
        ? {
            error_code: this.errors[0]?.code ?? "SCRIPT_GENERATION_FAILED",
            error_message: this.errors[0]?.message ?? "No script could be generated.",
          }
        : {}),
    };
  }
}
