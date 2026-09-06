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
    validateGlobSyntax(zone, zone.globs || [], definitionErrors);
  }

  for (const zone of zoneList) {
    for (const dependency of zone.readStableDependencies || []) {
      if (!ids.has(dependency)) {
        definitionErrors.push(error("missing_dependency", zone.id, `Zone "${zone.id}" references missing dependency "${dependency}".`));
      }
    }
    for (const coClaimZone of zone.coClaimWith || []) {
      if (!ids.has(coClaimZone)) {
        definitionErrors.push(error("missing_coclaim", zone.id, `Zone "${zone.id}" references missing co-claim zone "${coClaimZone}".`));
      }
    }
  }
  return { valid: definitionErrors.length === 0, definitionErrors };
}

/**
 * Rejects globs that would silently mis-match: empty values, embedded
 * whitespace or backslashes, `**` outside a path segment boundary, and
 * duplicates inside the same zone.
 */
function validateGlobSyntax(zone, globs, definitionErrors) {
  const seen = new Set();
  for (const rawGlob of globs) {
    const glob = String(rawGlob ?? "").trim();
    if (!glob) {
      definitionErrors.push(error("invalid_glob", zone.id, `Zone "${zone.id}" has an empty glob.`));
      continue;
    }
    if (/[\s\\]/.test(glob)) {
      definitionErrors.push(error("invalid_glob", zone.id, `Zone "${zone.id}" glob "${glob}" must not contain whitespace or backslashes.`));
      continue;
    }
    const pattern = glob.startsWith("!") ? glob.slice(1) : glob;
    if (pattern.includes("**") && !/(^|\/)\*\*($|\/)/.test(pattern)) {
      definitionErrors.push(error("invalid_glob", zone.id, `Zone "${zone.id}" glob "${glob}" uses ** outside a path segment boundary.`));
      continue;
    }
    if (seen.has(glob)) {
      definitionErrors.push(error("duplicate_glob", zone.id, `Zone "${zone.id}" repeats glob "${glob}".`));
      continue;
    }
    seen.add(glob);
  }
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

/**
 * Lists every tracked or non-ignored repository file. Since zones.yml 2.2.0
 * the ownership invariant covers the whole repository, not just product roots.
 */
function listProductFiles(workspaceRoot) {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  return output.split("\0").filter(Boolean).map(normalizePath).sort();
}

function error(code, zone, message) {
  return { code, zone, message };
}
