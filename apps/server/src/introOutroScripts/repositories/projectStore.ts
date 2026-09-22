import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { IntroOutroScriptProjectSchema, makeId, nowIso, type IntroOutroClipKind, type IntroOutroScriptProject } from "@studio/shared";
import { IntroOutroScriptError } from "../errors.js";
import { IntroOutroScriptStorage, isMissingFile } from "./storage.js";

export class IntroOutroProjectStore {
  constructor(private readonly storage: IntroOutroScriptStorage) {}

  async create(channelId: string, stylePresetId: string, name: string): Promise<IntroOutroScriptProject> {
    const now = nowIso();
    const project: IntroOutroScriptProject = {
      schema_version: 1,
      project_id: makeId("ioscript"),
      channel_id: channelId,
      style_preset_id: stylePresetId,
      name: name.trim(),
      version: 1,
      archived: false,
      drafts: {
        intro: emptyDraft("intro", now),
        outro: emptyDraft("outro", now),
      },
      revision_ids: [],
      approved_revision_ids: { intro: null, outro: null },
      created_at: now,
      updated_at: now,
    };
    await this.write(channelId, project);
    return project;
  }

  async get(channelId: string, projectId: string): Promise<IntroOutroScriptProject> {
    const manifestPath = path.join(await this.storage.projectRoot(channelId, projectId), "project.json");
    try {
      return IntroOutroScriptProjectSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
    } catch (error) {
      if (isMissingFile(error)) {
        throw new IntroOutroScriptError("Script project not found", "SCRIPT_PROJECT_NOT_FOUND");
      }
      throw error;
    }
  }

  async list(channelId: string, stylePresetId?: string, includeArchived = false): Promise<IntroOutroScriptProject[]> {
    const projectsRoot = path.join(await this.storage.channelRoot(channelId), "projects");
    const entries = await readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
    const projects = await Promise.all(
      entries.filter((entry) => entry.isDirectory()).map((entry) => this.get(channelId, entry.name).catch(() => null)),
    );
    return projects
      .filter((project): project is IntroOutroScriptProject => Boolean(project))
      .filter((project) => (stylePresetId ? project.style_preset_id === stylePresetId : true))
      .filter((project) => includeArchived || !project.archived)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  }

  async update(
    channelId: string,
    projectId: string,
    expectedVersion: number,
    mutate: (project: IntroOutroScriptProject) => IntroOutroScriptProject,
  ): Promise<IntroOutroScriptProject> {
    return this.storage.queue(`project:${channelId}:${projectId}`, async () => {
      const current = await this.get(channelId, projectId);
      if (current.version !== expectedVersion) {
        throw new IntroOutroScriptError("This script changed in another operation. Reload it before saving.", "VERSION_CONFLICT");
      }
      const updated = IntroOutroScriptProjectSchema.parse({
        ...mutate(structuredClone(current)),
        project_id: current.project_id,
        channel_id: current.channel_id,
        style_preset_id: current.style_preset_id,
        version: current.version + 1,
        created_at: current.created_at,
        updated_at: nowIso(),
      });
      await this.write(channelId, updated);
      return updated;
    });
  }

  async write(channelId: string, project: IntroOutroScriptProject): Promise<void> {
    const root = await this.storage.projectRoot(channelId, project.project_id);
    await mkdir(path.join(root, "revisions"), { recursive: true });
    await this.storage.repository.writeJsonAtomic(path.join(root, "project.json"), IntroOutroScriptProjectSchema.parse(project));
  }
}

function emptyDraft(clipKind: IntroOutroClipKind, now: string): IntroOutroScriptProject["drafts"]["intro"] {
  return {
    clip_kind: clipKind,
    target_duration_seconds: 8,
    seed_selection: null,
    content: null,
    validation_issues: [],
    source_revision_id: null,
    updated_at: now,
  };
}
