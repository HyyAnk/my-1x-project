import { openClaimsDb, getActiveClaims, getClaimById, withImmediateTransaction } from "./db.mjs";
import { loadZoneMap } from "./zone-loader.mjs";
import { captureGitBaseline, compareGitStates } from "./git-baseline.mjs";
import { findZonesForFile, normalizePath } from "./glob-matcher.mjs";
import { findWorkspaceRoot } from "./workspace-root.mjs";
import { assertLeaseToken } from "./lease-service.mjs";

/**
 * Inspects repository changes against a claim without authenticating or mutating it.
 */
export function inspectClaimScope({ claimId, workspaceRoot, customDbPath, changedFilesOverride } = {}) {
  const root = workspaceRoot || findWorkspaceRoot();
  const db = openClaimsDb(root, customDbPath);
  try {
    const claim = resolveClaim(db, claimId);
    assertClaimIsActive(claim);
    return inspectClaimScopeForClaim({ claim, root, changedFilesOverride, db });
  } finally {
    db.close();
  }
}

/**
 * Authenticates a claim, verifies its scope, and persists non-empty evidence when valid.
 */
export function verifyClaimScope({ claimId, leaseToken, evidenceSummary, workspaceRoot, customDbPath, changedFilesOverride } = {}) {
  const root = workspaceRoot || findWorkspaceRoot();
  const db = openClaimsDb(root, customDbPath);
  try {
    return withImmediateTransaction(db, () => {
      const claim = resolveClaim(db, claimId, { includeSecrets: true });
      assertClaimIsActive(claim);
      assertLeaseToken(claim, leaseToken);

      const evidence = String(evidenceSummary || "").trim();
      if (!evidence) throw new Error("A non-empty verification evidence summary is required.");

      const inspection = inspectClaimScopeForClaim({ claim, root, changedFilesOverride, db });
      if (!inspection.valid) return inspection;

      const verification = {
        verifiedAt: new Date().toISOString(),
        repositoryFingerprint: inspection.repositoryFingerprint,
        baseRevision: inspection.baseRevision,
        authorizedFiles: inspection.authorizedFiles,
        evidenceSummary: evidence,
      };
      db.prepare(
        `
        UPDATE claims SET verification_data = ?, updated_at = ? WHERE id = ? AND status = 'active'
      `,
      ).run(JSON.stringify(verification), verification.verifiedAt, claim.id);

      return { ...inspection, verification };
    });
  } finally {
    db.close();
  }
}

/**
 * Pure scope evaluation used by verification and transactional release.
 */
export function inspectClaimScopeForClaim({ claim, root, changedFilesOverride, db }) {
  const zoneList = loadZoneMap(root);
  const writeZones = new Set(claim.writeZones || []);
  const current = captureGitBaseline(root);
  const comparison = compareGitStates(claim.baseline, current);
  const { filesToVerify, ignoredBaselineFiles } = selectFilesToVerify({
    claim,
    comparison,
    changedFilesOverride,
    zoneList,
    writeZones,
    db,
  });
  const authorizedFiles = [];
  const violations = [];

  if (comparison.headChanged) {
    violations.push({
      file: ".git/HEAD",
      reason: "head_changed",
      message: `Git HEAD changed from ${claim.baseline?.baseRevision || claim.baseRevision} to ${current.baseRevision}.`,
      action: "Stop and ask the integrator to review the claim baseline before continuing.",
    });
  }

  for (const file of filesToVerify) {
    const matchingZones = findZonesForFile(file, zoneList);
    const coveredZone = matchingZones.find((zone) => writeZones.has(zone.id));
    if (coveredZone) {
      authorizedFiles.push({ file, zone: coveredZone.id });
      continue;
    }
    if (matchingZones.length === 0) {
      violations.push({
        file,
        reason: "no_matching_zone",
        message: "File does not match any zone defined in .agent-orchestrator/zones.yml.",
        action: "Define a zone covering this file, or revert the change.",
      });
      continue;
    }

    const requiredZoneIds = matchingZones.map((zone) => zone.id);
    violations.push({
      file,
      reason: "unclaimed_zone",
      matchingZones: requiredZoneIds,
      message: `Requires zone: [${requiredZoneIds.join(", ")}], but active claim only authorizes [${Array.from(writeZones).join(", ")}].`,
      action: `Run \`scripts/agent-expand.cmd --claim ${claim.id} --token <lease-token> --add-write ${requiredZoneIds.join(",")}\` before continuing.`,
    });
  }

  return {
    valid: violations.length === 0,
    claimId: claim.id,
    agent: claim.agent,
    claimedWriteZones: Array.from(writeZones),
    authorizedFiles,
    violations,
    ignoredBaselineFilesCount: ignoredBaselineFiles.length,
    repositoryFingerprint: current.repositoryFingerprint,
    baseRevision: current.baseRevision,
  };
}

function resolveClaim(db, claimId, options) {
  if (claimId) {
    const claim = getClaimById(db, claimId, options);
    if (!claim) throw new Error(`Claim not found: "${claimId}"`);
    return claim;
  }
  const active = getActiveClaims(db);
  if (active.length === 0) {
    throw new Error("No active claims found. Create a claim with scripts/agent-claim before editing files.");
  }
  if (active.length > 1) {
    throw new Error(`Multiple active claims exist (${active.map((claim) => claim.id).join(", ")}). Specify --claim <id>.`);
  }
  return options?.includeSecrets ? getClaimById(db, active[0].id, options) : active[0];
}

function assertClaimIsActive(claim) {
  if (claim.status === "released") {
    throw new Error(`Claim "${claim.id}" is already released and cannot authorize modifications.`);
  }
  if (claim.status !== "active") {
    throw new Error(`Claim "${claim.id}" has status "${claim.status}" and cannot authorize modifications.`);
  }
}

function selectFilesToVerify({ claim, comparison, changedFilesOverride, zoneList, writeZones, db }) {
  if (!changedFilesOverride) {
    let files = comparison.changedSinceBaseline.map(normalizePath);
    if (db) {
      const otherActive = getActiveClaims(db).filter((c) => c.id !== claim.id);
      if (otherActive.length > 0) {
        const otherZones = new Set(otherActive.flatMap((c) => c.writeZones || []));
        const otherPlannedFiles = new Set(otherActive.flatMap((c) => c.plannedFiles || []).map(normalizePath));
        files = files.filter((f) => {
          const matching = findZonesForFile(f, zoneList);
          // If the file is in our own claimed write zones, we must verify it
          if (matching.some((z) => writeZones.has(z.id))) return true;
          // If it matches another active claim's planned files or write zones, ignore it
          if (otherPlannedFiles.has(f)) return false;
          if (matching.some((z) => otherZones.has(z.id))) return false;
          return true;
        });
      }
    }
    return {
      filesToVerify: files,
      ignoredBaselineFiles: comparison.unchangedBaselineFiles,
    };
  }

  const baselineFiles = new Set(claim.baseline?.changedFiles || []);
  const filesToVerify = [];
  const ignoredBaselineFiles = [];
  for (const candidate of changedFilesOverride) {
    const file = normalizePath(candidate);
    const matchingZones = findZonesForFile(file, zoneList);
    const isClaimed = matchingZones.some((zone) => writeZones.has(zone.id));
    if (baselineFiles.has(file) && !isClaimed) ignoredBaselineFiles.push(file);
    else filesToVerify.push(file);
  }
  return { filesToVerify, ignoredBaselineFiles };
}
