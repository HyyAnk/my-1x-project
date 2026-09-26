import type {
  CreativeSeed,
  IntroOutroScriptJob,
  IntroOutroScriptProject,
  IntroOutroScriptRevision,
  MascotStyleIdentityProfile,
} from "@studio/shared";
import type { RepositoryService } from "../repository.js";
import { IntroOutroIdentitySeedStore } from "./repositories/identitySeedStore.js";
import { IntroOutroJobStore } from "./repositories/jobStore.js";
import { IntroOutroProjectStore } from "./repositories/projectStore.js";
import { IntroOutroRevisionStore } from "./repositories/revisionStore.js";
import { IntroOutroScriptStorage } from "./repositories/storage.js";

export class IntroOutroScriptRepository {
  private readonly storage: IntroOutroScriptStorage;
  private readonly identitiesAndSeeds: IntroOutroIdentitySeedStore;
  private readonly projects: IntroOutroProjectStore;
  private readonly revisions: IntroOutroRevisionStore;
  private readonly jobs: IntroOutroJobStore;

  constructor(repository: RepositoryService) {
    const storage = new IntroOutroScriptStorage(repository);
    this.storage = storage;
    this.identitiesAndSeeds = new IntroOutroIdentitySeedStore(storage);
    this.projects = new IntroOutroProjectStore(storage);
    this.revisions = new IntroOutroRevisionStore(storage, this.projects);
    this.jobs = new IntroOutroJobStore(storage);
  }

  getIdentityProfile(mascotId: string, styleId: string): Promise<MascotStyleIdentityProfile | null> {
    return this.identitiesAndSeeds.getIdentityProfile(mascotId, styleId);
  }

  withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    return this.storage.queue(key, operation);
  }

  async pairWorkspace(channelId: string, stylePresetId: string): Promise<IntroOutroScriptProject> {
    return this.withLock(`workspace:${channelId}:${stylePresetId}`, async () => {
      const current = (await this.listProjects(channelId, stylePresetId)).find((project) => project.purpose === "pair_workspace");
      if (current) return current;
      const created = await this.createProject(channelId, stylePresetId, "New Pair");
      return this.updateProject(channelId, created.project_id, created.version, (project) => ({ ...project, purpose: "pair_workspace" }));
    });
  }

  saveIdentityProfile(profile: MascotStyleIdentityProfile): Promise<MascotStyleIdentityProfile> {
    return this.identitiesAndSeeds.saveIdentityProfile(profile);
  }

  listCustomSeeds(channelId: string): Promise<CreativeSeed[]> {
    return this.identitiesAndSeeds.listCustomSeeds(channelId);
  }

  saveCustomSeed(channelId: string, seed: CreativeSeed): Promise<CreativeSeed> {
    return this.identitiesAndSeeds.saveCustomSeed(channelId, seed);
  }

  createProject(channelId: string, stylePresetId: string, name: string): Promise<IntroOutroScriptProject> {
    return this.projects.create(channelId, stylePresetId, name);
  }

  getProject(channelId: string, projectId: string): Promise<IntroOutroScriptProject> {
    return this.projects.get(channelId, projectId);
  }

  listProjects(channelId: string, stylePresetId?: string, includeArchived = false): Promise<IntroOutroScriptProject[]> {
    return this.projects.list(channelId, stylePresetId, includeArchived);
  }

  updateProject(
    channelId: string,
    projectId: string,
    expectedVersion: number,
    mutate: (project: IntroOutroScriptProject) => IntroOutroScriptProject,
  ): Promise<IntroOutroScriptProject> {
    return this.projects.update(channelId, projectId, expectedVersion, mutate);
  }

  appendRevision(
    channelId: string,
    revision: IntroOutroScriptRevision,
    expectedDraftVersion: number | null,
    requireVersionMatch = false,
  ): Promise<{ project: IntroOutroScriptProject; draftUpdated: boolean }> {
    return this.revisions.append(channelId, revision, expectedDraftVersion, requireVersionMatch);
  }

  getRevision(channelId: string, projectId: string, revisionId: string): Promise<IntroOutroScriptRevision> {
    return this.revisions.get(channelId, projectId, revisionId);
  }

  listRevisions(channelId: string, projectId: string): Promise<IntroOutroScriptRevision[]> {
    return this.revisions.list(channelId, projectId);
  }

  approveRevision(channelId: string, projectId: string, revisionId: string, expectedVersion: number): Promise<IntroOutroScriptProject> {
    return this.revisions.approve(channelId, projectId, revisionId, expectedVersion);
  }

  saveJob(job: IntroOutroScriptJob): Promise<IntroOutroScriptJob> {
    return this.jobs.save(job);
  }

  getJob(channelId: string, jobId: string): Promise<IntroOutroScriptJob> {
    return this.jobs.get(channelId, jobId);
  }

  listJobs(channelId: string): Promise<IntroOutroScriptJob[]> {
    return this.jobs.list(channelId);
  }

  findJobByIdempotency(channelId: string, key: string): Promise<IntroOutroScriptJob | null> {
    return this.jobs.findByIdempotency(channelId, key);
  }

  snapshotReference(channelId: string, projectId: string, sourcePath: string, filename: string): Promise<string> {
    return this.revisions.snapshot(channelId, projectId, sourcePath, filename);
  }

  readReferenceSnapshot(channelId: string, projectId: string, reference: IntroOutroScriptRevision["references"][number]): Promise<Buffer> {
    return this.revisions.readSnapshot(channelId, projectId, reference);
  }
}
