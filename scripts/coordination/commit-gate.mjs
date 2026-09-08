import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { openClaimsDb, getActiveClaims } from "./db.mjs";
import { loadZoneMap } from "./zone-loader.mjs";
import { findZonesForFile, normalizePath } from "./glob-matcher.mjs";
import { findWorkspaceRoot } from "./workspace-root.mjs";

/**
 * Cooperative pre-commit gate. Aligned with the protocol commit gate:
 * a file covered by an ACTIVE claim is unreleased work and must not be
 * committed; files matching no zone at all are a warning; everything
 * else is allowed. Like the protocol itself, the hook is bypassable.
 *
 * @param {Array<string>} files staged repository-relative paths
 * @param {Array<object>} activeClaims
 * @param {Array<object>} zoneList
 * @returns {{ blocked: Array<object>, warnings: Array<object>, allowed: Array<object>, valid: boolean }}
 */
export function classifyStagedFiles(files, activeClaims, zoneList) {
  const blocked = [];
  const warnings = [];
  const allowed = [];

  for (const rawFile of files) {
    const file = normalizePath(rawFile);
    const zones = findZonesForFile(file, zoneList).map((zone) => zone.id);
    const owner = activeClaims.find((claim) => (claim.writeZones || []).some((zone) => zones.includes(zone)));
    if (owner) {
      blocked.push({ file, zones, claim: owner.id, agent: owner.agent });
      continue;
    }
    if (zones.length === 0) {
      warnings.push({ file });
      continue;
    }
    allowed.push({ file, zones });
  }

  return { blocked, warnings, allowed, valid: blocked.length === 0 };
}

function getStagedFiles(workspaceRoot) {
  const output = execFileSync("git", ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  return output.split("\0").filter(Boolean);
}

function main() {
  const root = findWorkspaceRoot();
  const staged = getStagedFiles(root);
  if (staged.length === 0) {
    process.exit(0);
  }

  const zoneList = loadZoneMap(root);
  const db = openClaimsDb(root);
  let activeClaims;
  try {
    activeClaims = getActiveClaims(db);
  } finally {
    db.close();
  }

  const result = classifyStagedFiles(staged, activeClaims, zoneList);

  for (const warning of result.warnings) {
    process.stderr.write(`[commit-gate] warning: ${warning.file} is not mapped to any zone in .agent-orchestrator/zones.yml\n`);
  }

  if (!result.valid) {
    for (const entry of result.blocked) {
      process.stderr.write(
        `[commit-gate] blocked: ${entry.file} is owned by active claim "${entry.claim}" (agent: ${entry.agent}, zones: ${entry.zones.join(", ")}). Release or expand that claim before committing these files.\n`,
      );
    }
    process.exit(1);
  }

  process.stdout.write(`[commit-gate] ok: ${result.allowed.length} staged file(s) checked, ${result.warnings.length} warning(s)\n`);
  process.exit(0);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main();
}
