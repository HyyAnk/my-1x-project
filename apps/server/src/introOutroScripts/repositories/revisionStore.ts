import { access, copyFile, mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { IntroOutroScriptRevisionSchema, nowIso, type IntroOutroScriptProject, type IntroOutroScriptRevision } from "@studio/shared";
import { IntroOutroScriptError } from "../errors.js";
import { fingerprint } from "../fingerprint.js";
import type { IntroOutroProjectStore } from "./projectStore.js";
import { IntroOutroScriptStorage, isMissingFile, safeScriptId } from "./storage.js";

export class IntroOutroRevisionStore {
  constructor(
    private readonly storage: IntroOutroScriptStorage,
    private readonly projects: IntroOutroProjectStore,
  ) {}

  async readSnapshot(channelId: string, projectId: string, reference: IntroOutroScriptRevision["references"][number]): Promise<Buffer> {
    const root = path.join(await this.storage.projectRoot(channelId, projectId), "references");
    const extensions =
      reference.mime_type === "image/jpeg" ? [".jpg", ".jpeg"] : reference.mime_type === "image/webp" ? [".webp"] : [".png"];
    for (const extension of extensions) {
      const candidate = path.join(root, `${reference.role}-${reference.sha256}${extension}`);
      try {
        const bytes = await readFile(candidate);
        if (createHash("sha256").update(bytes).digest("hex") !== reference.sha256)
          throw new IntroOutroScriptError("Reference snapshot checksum mismatch", "SCRIPT_REFERENCE_INVALID");
        return bytes;
      } catch (error) {
        if (!isMissingFile(error)) throw error;
      }
    }
    throw new IntroOutroScriptError("Reference snapshot is missing; do not substitute the current asset", "SCRIPT_REFERENCE_INVALID");
  }

  async append(
    channelId: string,
    revision: IntroOutroScriptRevision,
    expectedDraftVersion: number | null,
    requireVersionMatch = false,
  ): Promise<{ project: IntroOutroScriptProject; draftUpdated: boolean }> {
    return this.storage.queue(`project:${channelId}:${revision.project_id}`, async () => {
      const parsedRevision = IntroOutroScriptRevisionSchema.parse(revision);
      const root = await this.storage.projectRoot(channelId, revision.project_id);
      await mkdir(path.join(root, "revisions"), { recursive: true });
      const current = await this.projects.get(channelId, revision.project_id);
      if (requireVersionMatch && expectedDraftVersion !== null && current.version !== expectedDraftVersion) {
        throw new IntroOutroScriptError("This script changed. Reload it before saving a revision.", "VERSION_CONFLICT");
      }

      const revisionPath = path.join(root, "revisions", `${safeScriptId(revision.revision_id)}.json`);
      try {
        await access(revisionPath);
        throw new IntroOutroScriptError("Script revision already exists", "SCRIPT_REVISION_EXISTS");
      } catch (error) {
        if (!isMissingFile(error)) throw error;
      }
      await this.storage.repository.writeJsonAtomic(revisionPath, parsedRevision);

      const draftUpdated = expectedDraftVersion === null || current.version === expectedDraftVersion;
      const updated: IntroOutroScriptProject = {
        ...current,
        version: current.version + 1,
        revision_ids: [...current.revision_ids, revision.revision_id],
        drafts: draftUpdated
          ? {
              ...current.drafts,
              [revision.clip_kind]: {
                ...current.drafts[revision.clip_kind],
                content: revision.content,
                seed_selection: revision.seed_selection,
                validation_issues: revision.validation_issues,
                source_revision_id: revision.revision_id,
                updated_at: nowIso(),
              },
            }
          : current.drafts,
        updated_at: nowIso(),
      };
      await this.projects.write(channelId, updated);
      return { project: updated, draftUpdated };
    });
  }

  async get(channelId: string, projectId: string, revisionId: string): Promise<IntroOutroScriptRevision> {
    const revisionPath = path.join(await this.storage.projectRoot(channelId, projectId), "revisions", `${safeScriptId(revisionId)}.json`);
    try {
      return IntroOutroScriptRevisionSchema.parse(JSON.parse(await readFile(revisionPath, "utf8")));
    } catch (error) {
      if (isMissingFile(error)) {
        throw new IntroOutroScriptError("Script revision not found", "SCRIPT_REVISION_NOT_FOUND");
      }
      throw error;
    }
  }

  async list(channelId: string, projectId: string): Promise<IntroOutroScriptRevision[]> {
    const project = await this.projects.get(channelId, projectId);
    const revisions = await Promise.all(project.revision_ids.map((id) => this.get(channelId, projectId, id).catch(() => null)));
    return revisions.filter((revision): revision is IntroOutroScriptRevision => Boolean(revision));
  }

  async approve(channelId: string, projectId: string, revisionId: string, expectedVersion: number): Promise<IntroOutroScriptProject> {
    const revision = await this.get(channelId, projectId, revisionId);
    if (
      revision.template_version === "intro-outro-script-v3" &&
      (!revision.quality_review || revision.quality_review.content_fingerprint !== fingerprint(revision.content))
    ) {
      throw new IntroOutroScriptError("This revision needs a current production quality review", "SCRIPT_VALIDATION_FAILED");
    }
    if (
      revision.validation_issues.some((item) => item.severity === "error") ||
      revision.quality_review?.findings.some((item) => item.severity === "error")
    ) {
      throw new IntroOutroScriptError("Resolve blocking validation errors before approval", "SCRIPT_VALIDATION_FAILED");
    }
    return this.projects.update(channelId, projectId, expectedVersion, (project) => ({
      ...project,
      approved_revision_ids: { ...project.approved_revision_ids, [revision.clip_kind]: revisionId },
    }));
  }

  async snapshot(channelId: string, projectId: string, sourcePath: string, filename: string): Promise<string> {
    const match = /^(?:mascot_subject|channel_logo)-([a-f0-9]{64})\.(?:png|jpe?g|webp)$/.exec(filename);
    if (!match) throw new IntroOutroScriptError("Invalid reference snapshot filename", "SCRIPT_REFERENCE_INVALID");
    return this.storage.queue(`snapshot:${channelId}:${projectId}:${filename}`, async () => {
      const root = path.join(await this.storage.projectRoot(channelId, projectId), "references");
      await mkdir(root, { recursive: true });
      const target = path.join(root, filename);
      try {
        const existing = await readFile(target);
        if (createHash("sha256").update(existing).digest("hex") !== match[1]) {
          throw new IntroOutroScriptError("Reference snapshot checksum mismatch", "SCRIPT_REFERENCE_INVALID");
        }
        return target;
      } catch (error) {
        if (!isMissingFile(error)) throw error;
      }
      const temporary = path.join(root, `.${filename}.${randomUUID()}.tmp`);
      try {
        await copyFile(sourcePath, temporary);
        const bytes = await readFile(temporary);
        if (createHash("sha256").update(bytes).digest("hex") !== match[1]) {
          throw new IntroOutroScriptError("Reference changed during snapshot", "SCRIPT_REFERENCE_INVALID");
        }
        await rename(temporary, target);
        return target;
      } finally {
        await rm(temporary, { force: true });
      }
    });
  }
}
