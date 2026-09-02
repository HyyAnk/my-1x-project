import path from "node:path";
import { findZonesForFile } from "./glob-matcher.mjs";

const WILDCARD_PATTERN = /[*?\[\]]/;

export function normalizePlannedFiles(files = [], workspaceRoot = process.cwd()) {
  const normalized = [];
  const seen = new Set();

  for (const file of files) {
    if (typeof file !== "string" || !file.trim()) {
      throw new Error("Each planned file must be a non-empty repository-relative path.");
    }
    if (WILDCARD_PATTERN.test(file)) {
      throw new Error(`Planned file "${file}" must be a concrete repository-relative file path; wildcards are not allowed.`);
    }

    const slashPath = file.trim().replace(/\\/g, "/").replace(/^\.\//, "");
    const normalizedPath = path.posix.normalize(slashPath);
    const resolvesOutside = normalizedPath === ".." || normalizedPath.startsWith("../");
    const isAbsolute = path.isAbsolute(file) || /^[a-zA-Z]:\//.test(slashPath) || slashPath.startsWith("/");
    if (isAbsolute || resolvesOutside) {
      throw new Error(`Planned file "${file}" must stay inside workspace "${workspaceRoot}".`);
    }

    const key = plannedPathKey(normalizedPath);
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(normalizedPath);
    }
  }

  return normalized;
}

export function validatePlannedFiles(zoneList, writeZones, plannedFiles) {
  const writeSet = new Set(writeZones || []);
  const errors = [];

  for (const file of plannedFiles || []) {
    const matching = findZonesForFile(file, zoneList);
    if (!matching.some((zone) => writeSet.has(zone.id))) {
      errors.push(`Planned file "${file}" does not belong to a claimed write zone.`);
    }
  }

  return errors;
}

export function findPlannedFileOverlap(first = [], second = []) {
  const firstKeys = new Set(first.map(plannedPathKey));
  return second.filter((file) => firstKeys.has(plannedPathKey(file)));
}

export function plannedPathKey(file) {
  const normalized = file.replace(/\\/g, "/").replace(/^\.\//, "").trim();
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
