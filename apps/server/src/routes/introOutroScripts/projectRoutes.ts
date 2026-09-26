import { nowIso, type IntroOutroScriptProject } from "@studio/shared";
import type { FastifyInstance } from "fastify";
import {
  CreateProjectInputSchema,
  ContextQuerySchema,
  DuplicateProjectInputSchema,
  ListProjectsQuerySchema,
  UpdateProjectInputSchema,
  type DraftPatch,
} from "./schemas.js";
import type { IntroOutroScriptRouteDeps } from "./types.js";

function applyDraftPatch(
  project: IntroOutroScriptProject,
  kind: "intro" | "outro",
  patch: DraftPatch | undefined,
): IntroOutroScriptProject["drafts"]["intro"] {
  const current = project.drafts[kind];
  if (!patch) return current;
  const contentChanged = patch.content !== undefined || patch.seed_selection !== undefined || patch.prompt_text !== undefined;
  return {
    ...current,
    ...patch,
    validation_issues: contentChanged ? [] : current.validation_issues,
    source_revision_id: contentChanged ? null : current.source_revision_id,
    updated_at: nowIso(),
  };
}

export function registerProjectRoutes(server: FastifyInstance, deps: IntroOutroScriptRouteDeps): void {
  server.post("/api/channels/:channelId/intro-outro-pair-workspace", async (request) => {
    const { channelId } = request.params as { channelId: string };
    const input = ContextQuerySchema.parse(request.body);
    const project = await deps.scripts.pairWorkspace(channelId, input.style_preset_id);
    const jobs = (await deps.scripts.listJobs(channelId))
      .filter((job) => job.project_id === project.project_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { project, job: jobs[0] ?? null };
  });
  server.get("/api/channels/:channelId/intro-outro-scripts", async (request) => {
    const { channelId } = request.params as { channelId: string };
    const query = ListProjectsQuerySchema.parse(request.query);
    return {
      projects: await deps.scripts.listProjects(channelId, query.style_preset_id, query.include_archived === "true"),
    };
  });

  server.post("/api/channels/:channelId/intro-outro-scripts", async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const input = CreateProjectInputSchema.parse(request.body);
    const project = await deps.scripts.createProject(channelId, input.style_preset_id, input.name);
    return reply.status(201).send({ project });
  });

  server.get("/api/channels/:channelId/intro-outro-scripts/:projectId", async (request) => {
    const { channelId, projectId } = request.params as { channelId: string; projectId: string };
    return { project: await deps.scripts.getProject(channelId, projectId) };
  });

  server.patch("/api/channels/:channelId/intro-outro-scripts/:projectId", async (request) => {
    const { channelId, projectId } = request.params as { channelId: string; projectId: string };
    const input = UpdateProjectInputSchema.parse(request.body);
    const project = await deps.scripts.updateProject(channelId, projectId, input.expected_version, (current) => ({
      ...current,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.archived !== undefined ? { archived: input.archived } : {}),
      drafts: {
        intro: applyDraftPatch(current, "intro", input.drafts?.intro),
        outro: applyDraftPatch(current, "outro", input.drafts?.outro),
      },
    }));
    return { project };
  });

  server.post("/api/channels/:channelId/intro-outro-scripts/:projectId/duplicate", async (request, reply) => {
    const { channelId, projectId } = request.params as { channelId: string; projectId: string };
    const input = DuplicateProjectInputSchema.parse(request.body ?? {});
    const source = await deps.scripts.getProject(channelId, projectId);
    const created = await deps.scripts.createProject(channelId, source.style_preset_id, input.name ?? `${source.name} Copy`);
    const project = await deps.scripts.updateProject(channelId, created.project_id, created.version, (current) => ({
      ...current,
      drafts: {
        intro: {
          ...source.drafts.intro,
          source_revision_id: null,
          validation_issues: [],
          updated_at: nowIso(),
        },
        outro: {
          ...source.drafts.outro,
          source_revision_id: null,
          validation_issues: [],
          updated_at: nowIso(),
        },
      },
    }));
    return reply.status(201).send({ project });
  });
}
