import { execFileSync } from "node:child_process";
import { findZonesForFile, normalizePath } from "./glob-matcher.mjs";

const VALID_LOCK_POLICIES = new Set(["exclusive", "shared-disjoint", "runtime"]);

export function validateZoneDefinitions(zoneList) {
  const definitionErrors = [];
  const ids = new Set();
  for (const zone of zoneList) {
    if (ids.has(zone.id)) {
      definitionErrors.push(error("duplicate_id", zone.id, `Zone ID "${zone.id}" is duplicated.`));
    }
    ids.add(zone.id);
    if (!VALID_LOCK_POLICIES.has(zone.lockPolicy)) {
      definitionErrors.push(error("invalid_lock_policy", zone.id, `Zone "${zone.id}" has invalid lock policy "${zone.lockPolicy}".`));
    }
    const positiveGlobs = (zone.globs || []).filter((glob) => !glob.trim().startsWith("!"));
    if (positiveGlobs.length === 0) {
      definitionErrors.push(error("negative_only_globs", zone.id, `Zone "${zone.id}" needs a positive glob.`));
    }
  }

  for (const zone of zoneList) {
    for (const dependency of zone.readStableDependencies || []) {
      if (!ids.has(dependency)) {
        definitionErrors.push(error("missing_dependency", zone.id, `Zone "${zone.id}" references missing dependency "${dependency}".`));
      }
    }
  }
  return { valid: definitionErrors.length === 0, definitionErrors };
}

export function auditZoneCoverage({ workspaceRoot, zoneList }) {
  const definition = validateZoneDefinitions(zoneList);
  const files = listProductFiles(workspaceRoot);
  const unmappedFiles = [];
  const overlappingFiles = [];
  for (const file of files) {
    const zones = findZonesForFile(file, zoneList).map((zone) => zone.id);
    if (zones.length === 0) unmappedFiles.push(file);
    else if (zones.length > 1) overlappingFiles.push({ file, zones });
  }
  const valid = definition.valid && unmappedFiles.length === 0 && overlappingFiles.length === 0;
  return {
    valid,
    definitionErrors: definition.definitionErrors,
    unmappedFiles,
    overlappingFiles,
    counts: {
      files: files.length,
      zones: zoneList.length,
      definitionErrors: definition.definitionErrors.length,
      unmapped: unmappedFiles.length,
      overlapping: overlappingFiles.length,
    },
  };
}

function listProductFiles(workspaceRoot) {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "apps", "packages", "services"],
    { cwd: workspaceRoot, encoding: "utf8", windowsHide: true },
  );
  return output.split("\0").filter(Boolean).map(normalizePath).sort();
}

function error(code, zone, message) {
  return { code, zone, message };
}
