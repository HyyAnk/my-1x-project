import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function parsePorcelainPath(line) {
  const content = line.slice(3).trim();
  return content.includes(" -> ") ? content.split(" -> ")[1].trim() : content;
}

export function captureGitBaseline(workspaceRoot) {
  const baseRevision = readHead(workspaceRoot);
  try {
    const rawStatus = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    const entries = parsePorcelainEntries(rawStatus);
    const fileFingerprints = Object.fromEntries(
      entries.map(({ path: file, status }) => [file, fingerprintPath(workspaceRoot, file, status)]),
    );
    const gitStatusShort = entries.map(({ path: file, status }) => `${status} ${file}`);
    const changedFiles = entries.map((entry) => entry.path);
    const repositoryFingerprint = fingerprintRepositoryState(baseRevision, fileFingerprints);
    return { baseRevision, gitStatusShort, changedFiles, fileFingerprints, repositoryFingerprint };
  } catch (error) {
    throw new Error(`Could not capture Git baseline: ${error.message}`);
  }
}

export function compareGitStates(baseline, current) {
  const before = baseline?.fileFingerprints || {};
  const after = current?.fileFingerprints || {};
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changedSinceBaseline = [];
  const unchangedBaselineFiles = [];

  for (const file of Array.from(paths).sort()) {
    if (sameFingerprint(before[file], after[file])) {
      if (before[file]) unchangedBaselineFiles.push(file);
    } else {
      changedSinceBaseline.push(file);
    }
  }

  return {
    headChanged: baseline?.baseRevision !== current?.baseRevision,
    changedSinceBaseline,
    unchangedBaselineFiles,
  };
}

export function getChangesSinceBaseline(workspaceRoot, baseline = {}) {
  const current = captureGitBaseline(workspaceRoot);
  if (Array.isArray(baseline)) {
    const baselineSet = new Set(baseline);
    return current.changedFiles.filter((file) => !baselineSet.has(file));
  }
  return compareGitStates(baseline, current).changedSinceBaseline;
}

function readHead(workspaceRoot) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  } catch {
    return "unknown";
  }
}

function parsePorcelainEntries(rawStatus) {
  const fields = rawStatus.split("\0");
  const entries = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field) continue;
    const status = field.slice(0, 2);
    const file = normalizePath(field.slice(3));
    entries.push({ status, path: file });
    if (/[RC]/.test(status)) index += 1;
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function fingerprintPath(workspaceRoot, file, status) {
  const fullPath = path.join(workspaceRoot, file);
  try {
    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink()) {
      return { status, kind: "symlink", hash: hash(fs.readlinkSync(fullPath)) };
    }
    if (stat.isFile()) {
      return { status, kind: "file", hash: hash(fs.readFileSync(fullPath)) };
    }
    return { status, kind: "directory", hash: null };
  } catch {
    return { status, kind: "missing", hash: null };
  }
}

function fingerprintRepositoryState(baseRevision, fileFingerprints) {
  const state = Object.entries(fileFingerprints)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([file, fingerprint]) => [file, fingerprint.status, fingerprint.kind, fingerprint.hash]);
  return hash(JSON.stringify([baseRevision, state]));
}

function sameFingerprint(first, second) {
  if (!first || !second) return first === second;
  return first.status === second.status && first.kind === second.kind && first.hash === second.hash;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePath(file) {
  return file.replace(/\\/g, "/").replace(/^\.\//, "");
}
