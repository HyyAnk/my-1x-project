import type { RepositoryRoots } from "../types.js";

export interface IStorageRepository {
  // Writer admission lifecycle
  acquireWriterAdmission(): void;
  releaseWriterAdmission(): Promise<void>;
  isWriterAdmissionHeld(): boolean;
  close(): Promise<void> | void;

  // Infrastructure & Path safety
  resolvePath(root: keyof RepositoryRoots, ...segments: string[]): string;
  resolveContextPath(relativePath: string): string;
  ensureBootstrap(): Promise<void>;
  assertBundleNumber(value: number): number;
  slugify(input: string): string;
  assertSlug(value: string): string;
  uniqueSlug(input: string, parentDirectory: string): Promise<string>;
  exists(target: string): Promise<boolean>;
  isInside(rootPath: string, targetPath: string): boolean;
  assertRealPathInside(rootPath: string, targetPath: string): Promise<void>;
  queueEpisodeArtifactMutation<T>(channelId: string, episodeId: string, operation: () => Promise<T>): Promise<T>;
  writeJsonAtomic(target: string, value: unknown): Promise<void>;
  writeTextAtomic(target: string, content: string): Promise<void>;
  writeBinaryAtomic(target: string, content: Uint8Array): Promise<void>;
  removeTree(target: string): Promise<void>;
  getTemplate(filename: string): Promise<string>;

  // Git Info
  getGitInfo(): Promise<{ branch: string | null; dirty: boolean; changed_files: number }>;
}
