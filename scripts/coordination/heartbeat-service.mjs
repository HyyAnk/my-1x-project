import { openClaimsDb, getClaimById } from "./db.mjs";
import { findWorkspaceRoot } from "./claim-service.mjs";
import { assertLeaseToken } from "./lease-service.mjs";

/**
 * Checks if an active claim has timed out or died.
 *
 * @param {object} claim
 * @param {Date} [nowDate=new Date()]
 * @returns {{ isDead: boolean, reason: string|null, elapsedMinutes: number }}
 */
export function isClaimDead(claim, nowDate = new Date()) {
  if (claim.status !== "active") {
    return { isDead: false, reason: null, elapsedMinutes: 0 };
  }

  const nowMs = nowDate.getTime();
  const expiresMs = new Date(claim.expiresAt).getTime();

  // 1. Overall TTL check
  if (nowMs > expiresMs) {
    return {
      isDead: true,
      reason: "ttl_expired",
      elapsedMinutes: Math.round((nowMs - expiresMs) / (60 * 1000)),
    };
  }

  // 2. Heartbeat timeout check
  const lastHeartbeatMs = new Date(claim.lastHeartbeatAt || claim.createdAt).getTime();
  const timeoutMs = (claim.heartbeatTimeoutMinutes ?? 15) * 60 * 1000;
  const elapsedMs = nowMs - lastHeartbeatMs;

  if (elapsedMs > timeoutMs) {
    return {
      isDead: true,
      reason: "heartbeat_timeout",
      elapsedMinutes: Math.round(elapsedMs / (60 * 1000)),
    };
  }

  return {
    isDead: false,
    reason: null,
    elapsedMinutes: Math.round(elapsedMs / (60 * 1000)),
  };
}

/**
 * Sends a heartbeat signal for an active claim, refreshing its liveliness timestamp.
 *
 * @param {object} options
 * @param {string} options.claimId
 * @param {string} [options.workspaceRoot]
 * @param {string} [options.customDbPath]
 * @returns {object}
 */
export function pulseHeartbeat({ claimId, leaseToken, workspaceRoot, customDbPath }) {
  if (!claimId) throw new Error("Missing required --claim <id>");

  const root = workspaceRoot || findWorkspaceRoot();
  const db = openClaimsDb(root, customDbPath);

  try {
    const claim = getClaimById(db, claimId, { includeSecrets: true });
    if (!claim) throw new Error(`Claim not found: "${claimId}"`);
    if (claim.status !== "active") {
      throw new Error(`Cannot send heartbeat for claim "${claimId}" because it is ${claim.status}.`);
    }
    assertLeaseToken(claim, leaseToken);

    const now = new Date();
    const nowIso = now.toISOString();

    // If claim is nearing its expiresAt (within 15 minutes), extend expiresAt by 60 minutes
    const expiresMs = new Date(claim.expiresAt).getTime();
    let newExpiresAt = claim.expiresAt;
    if (expiresMs - now.getTime() < 15 * 60 * 1000) {
      newExpiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }

    const stmt = db.prepare(`
      UPDATE claims SET
        last_heartbeat_at = ?,
        expires_at = ?,
        updated_at = ?
      WHERE id = ?
    `);
    stmt.run(nowIso, newExpiresAt, nowIso, claimId);

    return {
      success: true,
      claimId,
      agent: claim.agent,
      lastHeartbeatAt: nowIso,
      expiresAt: newExpiresAt,
      heartbeatTimeoutMinutes: claim.heartbeatTimeoutMinutes ?? 15,
    };
  } finally {
    db.close();
  }
}
