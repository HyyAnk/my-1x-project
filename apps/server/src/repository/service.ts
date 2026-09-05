import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { writeBinaryAtomic, writeJsonAtomic, writeTextAtomic } from "../utils/fs.js";
import { RepositoryError } from "./errors.js";
import {
  assertRealPathInside,
  createRoots,
  isInside,
  resolveContextPath as resolveSafeContextPath,
  resolvePath as resolveSafePath,
  slugify as createSlug,
} from "./pathSafety.js";
import type { RepositoryRuntime } from "./runtime.js";
import type { RepositoryRoots } from "./types.js";
import { channelBindings } from "./bindings/channelBindings.js";
import { topicBindings } from "./bindings/topicBindings.js";
import { mascotBindings } from "./bindings/mascotBindings.js";
import { voiceBindings } from "./bindings/voiceBindings.js";
import { episodeBindings } from "./bindings/episodeBindings.js";
import { quizArtifactBindings } from "./bindings/quizArtifactBindings.js";
import { sceneBindings } from "./bindings/sceneBindings.js";
import { mediaBindings } from "./bindings/mediaBindings.js";
import { miscBindings } from "./bindings/miscBindings.js";
import { questionBankBindings } from "./bindings/questionBankBindings.js";
import { listStylePresets, createStylePreset, updateStylePreset, deleteStylePreset } from "./stylePresets.js";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-declaration-merging
export interface RepositoryService extends RepositoryRuntime {}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class RepositoryService {
  roots: RepositoryRoots;
  readonly questionHistoryWrites = new Map<string, Promise<void>>();
  readonly usageLedgerWrites = new Map<string, Promise<void>>();

  constructor(
    readonly rootDirectory: string,
    storageRoot = rootDirectory,
  ) {
    this.roots = this.createRoots(storageRoot);
  }

  get storageRoot(): string {
    return path.dirname(this.roots.channels);
  }

  setStorageRoot(storageRoot: string): void {
    this.roots = this.createRoots(storageRoot);
  }

  resolveContextPath(relativePath: string): string {
    return resolveSafeContextPath(this.roots, relativePath);
  }

  async ensureBootstrap(): Promise<void> {
    await Promise.all([
      mkdir(this.roots.channels, { recursive: true }),
      mkdir(path.join(this.roots.runtime, "tasks"), { recursive: true }),
      mkdir(path.join(this.roots.runtime, "codex"), { recursive: true }),
      mkdir(path.join(this.roots.runtime, "logs"), { recursive: true }),
      mkdir(path.join(this.roots.runtime, "analytics"), { recursive: true }),
      mkdir(this.roots.voices, { recursive: true }),
      mkdir(this.roots.mascots, { recursive: true }),
    ]);
  }

  createRoots(storageRoot: string): RepositoryRoots {
    return createRoots(this.rootDirectory, storageRoot);
  }

  resolvePath(root: keyof RepositoryRoots, ...segments: string[]): string {
    return resolveSafePath(this.roots, root, ...segments);
  }

  slugify(input: string): string {
    return createSlug(input);
  }

  assertSlug(value: string): string {
    const slug = this.slugify(value);
    if (!slug) throw new RepositoryError(`Invalid slug: ${value}`, "INVALID_SLUG");
    return slug;
  }

  async uniqueSlug(input: string, parentDirectory: string): Promise<string> {
    const base = this.slugify(input);
    let candidate = base;
    let suffix = 2;
    while (await this.exists(path.join(parentDirectory, candidate))) {
      candidate = `${base}-${suffix}`;
      suffix++;
    }
    return candidate;
  }

  async exists(target: string): Promise<boolean> {
    try {
      await access(target);
      return true;
    } catch {
      return false;
    }
  }

  isInside(rootPath: string, targetPath: string): boolean {
    return isInside(rootPath, targetPath);
  }

  assertRealPathInside(rootPath: string, targetPath: string): Promise<void> {
    return assertRealPathInside(rootPath, targetPath);
  }

  writeJsonAtomic(target: string, value: unknown): Promise<void> {
    return writeJsonAtomic(target, value);
  }

  writeTextAtomic(target: string, content: string): Promise<void> {
    return writeTextAtomic(target, content);
  }

  writeBinaryAtomic(target: string, content: Uint8Array): Promise<void> {
    return writeBinaryAtomic(target, content);
  }

  removeTree(target: string): Promise<void> {
    return rm(target, { recursive: true, force: true });
  }

  assertBundleNumber(value: number): number {
    if (!Number.isInteger(value) || value < 1) {
      throw new RepositoryError(`Invalid bundle number: ${value}`, "INVALID_BUNDLE_NUMBER");
    }
    return value;
  }
}

// Bind all domain repository implementations to RepositoryService prototype
Object.assign(
  RepositoryService.prototype,
  channelBindings,
  topicBindings,
  mascotBindings,
  voiceBindings,
  episodeBindings,
  quizArtifactBindings,
  sceneBindings,
  mediaBindings,
  miscBindings,
  questionBankBindings,
  { listStylePresets, createStylePreset, updateStylePreset, deleteStylePreset },
);
