import { openClaimsDb, getActiveClaims, getClaimById, insertClaimRecord, deserializeRow, withImmediateTransaction } from "./db.mjs";
import { loadZoneMap } from "./zone-loader.mjs";
import { captureGitBaseline } from "./git-baseline.mjs";
import { validateAndCheckConflicts } from "./conflict-checker.mjs";
import { isClaimDead } from "./heartbeat-service.mjs";
import { normalizePlannedFiles, validatePlannedFiles } from "./path-ownership.mjs";
import { assertLeaseToken, createLeaseToken } from "./lease-service.mjs";
import { inspectClaimScopeForClaim } from "./diff-guard-service.mjs";
import { findWorkspaceRoot } from "./workspace-root.mjs";

export { findWorkspaceRoot } from "./workspace-root.mjs";

/**
 * Creates a new zone claim.
 */
export function claimZone({
  agent,
  task,
  writeZones = [],
  readStableZones = [],
  plannedFiles = [],
  ttlMinutes = 120,
  heartbeatTimeoutMinutes = 15,
  queuePriority = 100,
  claimId,
  workspaceRoot,
  customDbPath,
}) {
  const root = workspaceRoot || findWorkspaceRoot();
  if (!agent || !task) {
    throw new Error("Both --agent and --task are required.");
  }
  if (!Array.isArray(writeZones) || writeZones.length === 0) {
    throw new Error("At least one write zone must be specified via --write.");
  }

  const zoneList = loadZoneMap(root);
  const normalizedPlannedFiles = normalizePlannedFiles(plannedFiles, root);
  const plannedFileErrors = validatePlannedFiles(zoneList, writeZones, normalizedPlannedFiles);
  if (plannedFileErrors.length > 0) {
    throw new Error(`Claim rejected due to invalid planned files:\n- ${plannedFileErrors.join("\n- ")}`);
  }
  const baseline = captureGitBaseline(root);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();
  const id = claimId || `claim-${agent.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
  const zoneMap = new Map(zoneList.map((z) => [z.id, z]));
  const verificationSet = new Set();
  for (const writeZone of writeZones) {
    const definition = zoneMap.get(writeZone);
    for (const command of definition?.verification?.commands || []) {
      verificationSet.add(command);
    }
  }
  const lease = createLeaseToken();

  const db = openClaimsDb(root, customDbPath);
  try {
    return withImmediateTransaction(db, () => {
      const activeClaims = getActiveClaims(db);
      const check = validateAndCheckConflicts(zoneList, activeClaims, {
        writeZones,
        readStableZones,
        plannedFiles: normalizedPlannedFiles,
      });

      if (!check.valid) {
        const error = new Error(`Claim rejected due to conflicts:\n- ${check.conflicts.join("\n- ")}`);
        error.conflicts = check.conflicts;
        throw error;
      }

      const storedClaim = {
        id,
        agent,
        task,
        status: "active",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt,
        workingMode: "main-direct",
        baseRevision: baseline.baseRevision,
        workspaceRoot: root,
        writeZones,
        readStableZones: check.resolvedReadStableZones,
        plannedFiles: normalizedPlannedFiles,
        baseline,
        verificationRequired: Array.from(verificationSet),
        release: null,
        lastHeartbeatAt: now.toISOString(),
        heartbeatTimeoutMinutes,
        queuePriority,
        queueStatus: "active",
        leaseTokenHash: lease.hash,
        verification: null,
      };

      insertClaimRecord(db, storedClaim);
      const { leaseTokenHash: _secret, ...publicClaim } = storedClaim;
      return { ...publicClaim, leaseToken: lease.token };
    });
  } finally {
    db.close();
  }
}

/**
 * Expands an existing active claim with additional zones or planned files.
 */
export function expandActiveClaim({
  claimId,
  leaseToken,
  addWriteZones = [],
  addReadStableZones = [],
  addPlannedFiles = [],
  workspaceRoot,
  customDbPath,
}) {
  const root = workspaceRoot || findWorkspaceRoot();
  const db = openClaimsDb(root, customDbPath);
  try {
    return withImmediateTransaction(db, () => {
      const claim = getClaimById(db, claimId, { includeSecrets: true });
      if (!claim) throw new Error(`Claim not found: "${claimId}"`);
      if (claim.status !== "active") throw new Error(`Claim "${claimId}" is not active (current status: ${claim.status})`);
      assertLeaseToken(claim, leaseToken);

      const zoneList = loadZoneMap(root);
      const combinedWrites = Array.from(new Set([...claim.writeZones, ...addWriteZones]));
      const combinedReads = Array.from(new Set([...claim.readStableZones, ...addReadStableZones]));
      const combinedPlanned = normalizePlannedFiles([...claim.plannedFiles, ...addPlannedFiles], root);
      const plannedFileErrors = validatePlannedFiles(zoneList, combinedWrites, combinedPlanned);
      if (plannedFileErrors.length > 0) {
        throw new Error(`Expansion rejected due to invalid planned files:\n- ${plannedFileErrors.join("\n- ")}`);
      }
      const activeClaims = getActiveClaims(db);
      const check = validateAndCheckConflicts(
        zoneList,
        activeClaims,
        { writeZones: combinedWrites, readStableZones: combinedReads, plannedFiles: combinedPlanned },
        claimId,
      );

      if (!check.valid) {
        const error = new Error(`Expansion rejected due to conflicts:\n- ${check.conflicts.join("\n- ")}`);
        error.conflicts = check.conflicts;
        throw error;
      }

      const now = new Date().toISOString();
      claim.writeZones = combinedWrites;
      claim.readStableZones = check.resolvedReadStableZones;
      claim.plannedFiles = combinedPlanned;
      claim.updatedAt = now;

      db.prepare(
        `
        UPDATE claims SET
          write_zones = ?,
          read_stable_zones = ?,
          planned_files = ?,
          updated_at = ?
        WHERE id = ?
      `,
      ).run(JSON.stringify(claim.writeZones), JSON.stringify(claim.readStableZones), JSON.stringify(claim.plannedFiles), now, claimId);

      return withoutLeaseSecret(claim);
    });
  } finally {
    db.close();
  }
}

/**
 * Releases an active claim.
 */
export function releaseActiveClaim({ claimId, leaseToken, releasedBy, workspaceRoot, customDbPath }) {
  const root = workspaceRoot || findWorkspaceRoot();
  const db = openClaimsDb(root, customDbPath);
  try {
    return withImmediateTransaction(db, () => {
      const claim = getClaimById(db, claimId, { includeSecrets: true });
      if (!claim) throw new Error(`Claim not found: "${claimId}"`);
      if (claim.status !== "active") throw new Error(`Claim "${claimId}" is already ${claim.status}.`);
      assertLeaseToken(claim, leaseToken);
      if (!claim.verification?.repositoryFingerprint || !claim.verification?.evidenceSummary) {
        throw new Error(`Claim "${claimId}" has no successful verification record and cannot be released.`);
      }

      const inspection = inspectClaimScopeForClaim({ claim, root, db });
      if (!inspection.valid) {
        const reasons = inspection.violations.map((violation) => violation.reason).join(", ");
        throw new Error(`Claim scope verification failed during release: ${reasons}.`);
      }
      if (claim.verification.repositoryFingerprint !== inspection.repositoryFingerprint) {
        throw new Error("Claim verification is stale because the repository changed after verification.");
      }

      const now = new Date().toISOString();
      claim.status = "released";
      claim.updatedAt = now;
      claim.release = {
        releasedAt: now,
        releasedBy: releasedBy || claim.agent,
        verificationSummary: claim.verification.evidenceSummary,
        filesChanged: inspection.authorizedFiles.map(({ file }) => file),
      };

      db.prepare(
        `
        UPDATE claims SET status = 'released', updated_at = ?, release_data = ?
        WHERE id = ? AND status = 'active'
      `,
      ).run(now, JSON.stringify(claim.release), claimId);
      return withoutLeaseSecret(claim);
    });
  } finally {
    db.close();
  }
}

/**
 * Cleans up expired and dead-heartbeat active claims.
 */
export function cleanupStaleActiveClaims({ dryRun = false, workspaceRoot, customDbPath } = {}) {
  const root = workspaceRoot || findWorkspaceRoot();
  const db = openClaimsDb(root, customDbPath);
  try {
    const active = getActiveClaims(db);
    const now = new Date();
    const nowIso = now.toISOString();

    const deadClaims = [];
    for (const c of active) {
      const deadCheck = isClaimDead(c, now);
      if (deadCheck.isDead) {
        c.deadReason = deadCheck.reason;
        c.elapsedMinutes = deadCheck.elapsedMinutes;
        deadClaims.push(c);
      }
    }

    if (!dryRun && deadClaims.length > 0) {
      const updateStmt = db.prepare(`UPDATE claims SET status = 'expired', updated_at = ? WHERE id = ?`);
      for (const c of deadClaims) {
        updateStmt.run(nowIso, c.id);
        c.status = "expired";
        c.updatedAt = nowIso;
      }
    }

    return {
      cleanedCount: deadClaims.length,
      dryRun,
      claims: deadClaims,
    };
  } finally {
    db.close();
  }
}

/**
 * Fetches status of claims.
 */
export function getStatus({ claimId, includeHistory = false, workspaceRoot, customDbPath } = {}) {
  const root = workspaceRoot || findWorkspaceRoot();
  const db = openClaimsDb(root, customDbPath);
  try {
    if (claimId) {
      const claim = getClaimById(db, claimId);
      if (!claim) throw new Error(`Claim not found: "${claimId}"`);
      return { claim };
    }

    if (includeHistory) {
      const stmt = db.prepare(`SELECT * FROM claims ORDER BY created_at DESC`);
      const rows = stmt.all();
      return { claims: rows.map(deserializeRow) };
    }

    const active = getActiveClaims(db);
    return { claims: active };
  } finally {
    db.close();
  }
}

function withoutLeaseSecret(claim) {
  const { leaseTokenHash: _secret, ...publicClaim } = claim;
  return publicClaim;
}
