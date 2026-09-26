import {
  makeId,
  type BatchGenerateIntroOutroScriptsInput,
  type BatchGenerateIntroOutroScriptsResponse,
  type IntroOutroClipKind,
} from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { resolveIntroOutroContext } from "./contextResolver.js";
import type { IntroOutroScriptJobManager } from "./jobManager.js";
import type { IntroOutroScriptRepository } from "./repository.js";

export type BatchCoordinatorDeps = {
  repository: RepositoryService;
  scripts: IntroOutroScriptRepository;
  jobs: IntroOutroScriptJobManager;
};

export class IntroOutroBatchJobCoordinator {
  constructor(private readonly deps: BatchCoordinatorDeps) {}

  async generateBatch(channelId: string, input: BatchGenerateIntroOutroScriptsInput): Promise<BatchGenerateIntroOutroScriptsResponse> {
    const context = await resolveIntroOutroContext({
      repository: this.deps.repository,
      scripts: this.deps.scripts,
      channelId,
      stylePresetId: input.style_preset_id,
      mascotStyleId: input.mascot_style_id,
    });

    const batchId = makeId("ioscript_batch");
    const projectIds: string[] = [];
    const jobIds: string[] = [];

    const basePrefix = input.naming_prefix?.trim()
      ? input.naming_prefix.trim()
      : `${context.publicContext.mascot_style_name ?? "Pair"} Concept`;

    for (let index = 1; index <= input.count; index += 1) {
      const projectName = `${basePrefix} #${index}`;
      const project = await this.deps.scripts.createProject(channelId, input.style_preset_id, projectName);
      projectIds.push(project.project_id);

      const clips = input.included_clips.map((clipKind: IntroOutroClipKind) => {
        const randomizationSeed = makeId("seed");
        return {
          clipKind,
          durationSeconds: input.durations[clipKind] ?? 8,
          randomizationSeed,
          selectedSeedIds: input.strategy === "locked_anchor" ? input.locked_seed_ids : undefined,
          logoMode: input.logo_mode,
        };
      });

      const job = await this.deps.jobs.startScriptGeneration({
        channelId,
        projectId: project.project_id,
        stylePresetId: input.style_preset_id,
        mascotStyleId: input.mascot_style_id,
        projectVersion: project.version,
        clips,
        idempotencyKey: makeId("batch_job_item"),
      });

      jobIds.push(job.job_id);
    }

    return {
      batch_id: batchId,
      channel_id: channelId,
      style_preset_id: input.style_preset_id,
      total_jobs: input.count,
      project_ids: projectIds,
      job_ids: jobIds,
    };
  }
}
