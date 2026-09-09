import { lstat } from "node:fs/promises";
import path from "node:path";
import { RepositoryError } from "../../errors.js";

/** Validates one user- or file-derived Bank path segment before it is joined. */
export function assertSafeBankPathSegment(value: string, label: string): void {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value === "." ||
    value === ".." ||
    value.includes("\0") ||
    value.includes("/") ||
    value.includes("\\") ||
    path.isAbsolute(value) ||
    /^[A-Za-z]:/.test(value)
  ) {
    throw new RepositoryError(`Unsafe Question Bank ${label}: "${String(value)}"`, "UNSAFE_PATH");
  }
}

export function assertSafeBankPathSegments(segments: readonly string[], labels: readonly string[] = []): void {
  segments.forEach((segment, index) => assertSafeBankPathSegment(segment, labels[index] ?? "path segment"));
}

/** Reject symlinks and junctions in an existing path or any existing parent. */
export async function assertSafeBankFilesystemPath(rootPath: string, targetPath: string): Promise<void> {
  const root = path.resolve(rootPath);
  const target = path.resolve(targetPath);
  if (!isInside(root, target)) {
    throw new RepositoryError(`Question Bank path escaped its root: "${targetPath}"`, "UNSAFE_PATH");
  }

  let current = target;
  while (true) {
    try {
      if ((await lstat(current)).isSymbolicLink()) {
        throw new RepositoryError(`Question Bank path contains a symlink or junction: "${current}"`, "UNSAFE_PATH");
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
    }
    if (current === root) return;
    const parent = path.dirname(current);
    if (parent === current) {
      throw new RepositoryError(`Question Bank path could not be contained: "${targetPath}"`, "UNSAFE_PATH");
    }
    current = parent;
  }
}

function isInside(rootPath: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
