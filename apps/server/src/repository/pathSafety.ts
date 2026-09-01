import { realpath } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "./errors.js";
import type { RepositoryRoots } from "./types.js";
import { STUDIO_RUNTIME_DIRECTORY, studioRuntimePath } from "../runtimePaths.js";

export function createRoots(rootDirectory: string, storageRoot: string): RepositoryRoots {
  const resolvedStorageRoot = path.resolve(storageRoot);
  return {
    channels: path.join(resolvedStorageRoot, "channels"),
    templates: path.join(rootDirectory, "templates"),
    shared: path.join(rootDirectory, "shared"),
    assets: path.join(rootDirectory, "assets"),
    runtime: studioRuntimePath(resolvedStorageRoot),
    voices: studioRuntimePath(resolvedStorageRoot, "voices"),
    mascots: studioRuntimePath(resolvedStorageRoot, "mascots"),
  };
}

export function isInside(rootPath: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function resolveContextPath(roots: RepositoryRoots, relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/");
  const [root, ...segments] = normalized.split("/");
  const contextRoots: Record<string, string> = {
    channels: roots.channels,
    templates: roots.templates,
    shared: roots.shared,
    assets: roots.assets,
    [STUDIO_RUNTIME_DIRECTORY]: roots.runtime,
  };
  const base = contextRoots[root ?? ""];
  if (!base || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new RepositoryError("Unsafe context path", "UNSAFE_PATH");
  }
  const resolved = path.resolve(base, ...segments);
  if (!isInside(base, resolved)) throw new RepositoryError("Resolved context path escaped its root", "UNSAFE_PATH");
  return resolved;
}

export function resolvePath(roots: RepositoryRoots, root: keyof RepositoryRoots, ...segments: string[]): string {
  const rootPath = roots[root];
  for (const segment of segments) {
    if (
      !segment ||
      segment.includes("\0") ||
      path.isAbsolute(segment) ||
      segment.includes("/") ||
      segment.includes("\\") ||
      /^[A-Za-z]:/.test(segment)
    ) {
      throw new RepositoryError("Unsafe filesystem path", "UNSAFE_PATH");
    }
  }
  const resolved = path.resolve(rootPath, ...segments);
  if (!isInside(rootPath, resolved)) throw new RepositoryError("Resolved path escaped its root", "UNSAFE_PATH");
  return resolved;
}

export function slugify(input: string): string {
  const normalized = input
    .trim()
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  if (!slug) throw new RepositoryError("Name cannot produce a safe slug", "EMPTY_SLUG");
  return slug;
}

export async function assertRealPathInside(rootPath: string, targetPath: string): Promise<void> {
  const [realRoot, realTarget] = await Promise.all([realpath(rootPath), realpath(targetPath)]);
  if (!isInside(realRoot, realTarget)) throw new RepositoryError("Filesystem path escaped its root", "UNSAFE_PATH");
}
