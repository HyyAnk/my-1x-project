import type { FastifyInstance } from "fastify";
import { resolveIntroOutroContext } from "../../introOutroScripts/contextResolver.js";
import { IntroOutroScriptError } from "../../introOutroScripts/errors.js";
import { compileProductionPrompt } from "../../introOutroScripts/promptCompiler.js";
import { checkpointDraft } from "../../introOutroScripts/revisionService.js";
import { resolveSeedSelection } from "../../introOutroScripts/seedSelection.js";
import { hasBlockingIssues, validateScriptContent } from "../../introOutroScripts/validation.js";
import { ApproveRevisionInputSchema, CheckpointInputSchema, GenerateScriptsInputSchema, ValidateDraftInputSchema } from "./schemas.js";
import { loadSeedCatalog, resolveDraftSeedSnapshot } from "./seedHelpers.js";
import type { IntroOutroScriptRouteDeps } from "./types.js";

export function registerWorkflowRoutes(server: FastifyInstance, deps: IntroOutroScriptRouteDeps): void {
  server.get("/api/channels/:channelId/intro-outro-scripts/:projectId/revisions", async (request) => {
    const { channelId, projectId } = request.params as { channelId: string; projectId: string };
    return { revisions: await deps.scripts.listRevisions(channelId, projectId) };
  });

  server.post("/api/channels/:channelId/intro-outro-scripts/:projectId/revisions", async (request, reply) => {
    const { channelId, projectId } = request.params as { channelId: string; projectId: string };
    const input = CheckpointInputSchema.parse(request.body);
    const project = await deps.scripts.getProject(channelId, projectId);
    if (project.version !== input.expected_version) {
      throw new IntroOutroScriptError("This script changed. Reload it before saving a revision.", "VERSION_CONFLICT");
    }
    const content = project.drafts[input.clip_kind].content;
    if (!content) throw new IntroOutroScriptError("The selected draft is empty", "SCRIPT_DRAFT_EMPTY");
    const context = await resolveIntroOutroContext({
      repository: deps.repository,
      scripts: deps.scripts,
      channelId,
      stylePresetId: project.style_preset_id,
      mascotStyleId: input.mascot_style_id,
    });
    const { latest } = await loadSeedCatalog(deps.scripts, channelId);
    const seeds = await resolveDraftSeedSnapshot({ scripts: deps.scripts, project, clipKind: input.clip_kind, catalog: latest });
    const revision = await checkpointDraft({
      scripts: deps.scripts,
      context,
      project,
      clipKind: input.clip_kind,
      content,
      seeds,
      warningAcknowledgements: input.warning_acknowledgements,
      requestedModel: deps.model,
      client: deps.client,
    });
    const result = await deps.scripts.appendRevision(channelId, revision, input.expected_version, true);
    return reply.status(201).send({ revision, project: result.project });
  });

  server.post("/api/channels/:channelId/intro-outro-scripts/:projectId/validate", async (request) => {
    const { channelId, projectId } = request.params as { channelId: string; projectId: string };
    const input = ValidateDraftInputSchema.parse(request.body);
    const project = await deps.scripts.getProject(channelId, projectId);
    const draft = project.drafts[input.clip_kind];
    if (!draft.content) throw new IntroOutroScriptError("The selected draft is empty", "SCRIPT_DRAFT_EMPTY");
    const context = await resolveIntroOutroContext({
      repository: deps.repository,
      scripts: deps.scripts,
      channelId,
      stylePresetId: project.style_preset_id,
      mascotStyleId: input.mascot_style_id,
    });
    if (!context.identity) throw new IntroOutroScriptError("Review mascot identity first", "IDENTITY_REVIEW_REQUIRED");
    const { latest } = await loadSeedCatalog(deps.scripts, channelId);
    const seeds = await resolveDraftSeedSnapshot({ scripts: deps.scripts, project, clipKind: input.clip_kind, catalog: latest });
    const issues = validateScriptContent(draft.content, context.identity, seeds);
    return { valid: !hasBlockingIssues(issues), issues };
  });

  server.post("/api/channels/:channelId/intro-outro-scripts/:projectId/generate", async (request, reply) => {
    const { channelId, projectId } = request.params as { channelId: string; projectId: string };
    const input = GenerateScriptsInputSchema.parse(request.body);
    const project = await deps.scripts.getProject(channelId, projectId);
    const context = await resolveIntroOutroContext({
      repository: deps.repository,
      scripts: deps.scripts,
      channelId,
      stylePresetId: project.style_preset_id,
      mascotStyleId: input.mascot_style_id,
    });
    if (!context.identity || context.publicContext.identity_status !== "reviewed") {
      throw new IntroOutroScriptError("Review mascot identity first", "IDENTITY_REVIEW_REQUIRED");
    }
    const { latest } = await loadSeedCatalog(deps.scripts, channelId);
    const clips = input.clips.map((clip) => {
      const resolved = resolveSeedSelection({
        clipKind: clip.clip_kind,
        catalog: latest,
        identity: context.identity!,
        randomizationSeed: clip.randomization_seed,
        selectedSeedIds: clip.selected_seed_ids,
        lockedDimensions: clip.locked_dimensions,
      });
      return {
        clipKind: clip.clip_kind,
        durationSeconds: clip.duration_seconds,
        seedSelection: resolved.selection,
        seeds: resolved.seeds,
      };
    });
    const job = await deps.jobs.startScriptGeneration({
      channelId,
      projectId,
      stylePresetId: project.style_preset_id,
      mascotStyleId: input.mascot_style_id,
      projectVersion: input.expected_version,
      clips,
      idempotencyKey: input.idempotency_key,
    });
    return reply.status(202).send({ job });
  });

  server.post("/api/channels/:channelId/intro-outro-scripts/:projectId/approve", async (request) => {
    const { channelId, projectId } = request.params as { channelId: string; projectId: string };
    const input = ApproveRevisionInputSchema.parse(request.body);
    return {
      project: await deps.scripts.approveRevision(channelId, projectId, input.revision_id, input.expected_version),
    };
  });

  server.get("/api/channels/:channelId/intro-outro-scripts/:projectId/revisions/:revisionId/export", async (request) => {
    const { channelId, projectId, revisionId } = request.params as {
      channelId: string;
      projectId: string;
      revisionId: string;
    };
    const revision = await deps.scripts.getRevision(channelId, projectId, revisionId);
    return { prompt: compileProductionPrompt(revision), references: revision.references, revision };
  });

  server.get("/api/channels/:channelId/intro-outro-script-jobs/:jobId", async (request) => {
    const { channelId, jobId } = request.params as { channelId: string; jobId: string };
    return { job: await deps.scripts.getJob(channelId, jobId) };
  });

  server.post("/api/channels/:channelId/intro-outro-script-jobs/:jobId/cancel", async (request) => {
    const { channelId, jobId } = request.params as { channelId: string; jobId: string };
    return { job: await deps.jobs.cancel(channelId, jobId) };
  });
}
