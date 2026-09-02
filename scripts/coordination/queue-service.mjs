import { openClaimsDb, deserializeRow } from "./db.mjs";
import { findWorkspaceRoot } from "./workspace-root.mjs";
import { isClaimDead } from "./heartbeat-service.mjs";
import { inspectClaimScope } from "./diff-guard-service.mjs";

/**
 * Builds an Integrator Status Report for all active, blocked, stale, and releasable claims.
 *
 * @param {object} [options]
 * @param {string} [options.workspaceRoot]
 * @param {string} [options.customDbPath]
 * @returns {object}
 */
export function getIntegratorReport({ workspaceRoot, customDbPath } = {}) {
  const root = workspaceRoot || findWorkspaceRoot();
  const db = openClaimsDb(root, customDbPath);

  try {
    const stmt = db.prepare(`SELECT * FROM claims ORDER BY created_at ASC`);
    const allClaims = stmt.all().map(deserializeRow);

    const now = new Date();
    const active = [];
    const stale = [];
    const releasable = [];
    const released = [];
    const blocked = [];

    // Filter active vs released/expired
    for (const c of allClaims) {
      if (c.status === "released") {
        released.push(c);
        continue;
      }
      if (c.status === "expired" || c.status === "stale") {
        stale.push(c);
        continue;
      }

      // Claim is marked active: check deadness
      const deadCheck = isClaimDead(c, now);
      if (deadCheck.isDead) {
        c.deadReason = deadCheck.reason;
        c.elapsedMinutes = deadCheck.elapsedMinutes;
        stale.push(c);
        continue;
      }

      // Scope inspection is read-only. A claim is releasable only with fresh stored evidence.
      try {
        const diffCheck = inspectClaimScope({
          claimId: c.id,
          workspaceRoot: root,
          customDbPath,
        });
        c.scopeClean = diffCheck.valid;
        c.diffViolations = diffCheck.violations;
        const verificationIsFresh = c.verification?.repositoryFingerprint === diffCheck.repositoryFingerprint;
        if (diffCheck.valid && verificationIsFresh) {
          releasable.push(c);
        }
      } catch {
        c.scopeClean = false;
      }

      active.push(c);
    }

    // Sort integration queue by priority and creation time
    const integrationQueue = [...active].sort((a, b) => {
      const pDiff = (a.queuePriority ?? 100) - (b.queuePriority ?? 100);
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return {
      summary: {
        totalClaims: allClaims.length,
        activeCount: active.length,
        releasableCount: releasable.length,
        staleCount: stale.length,
        releasedCount: released.length,
      },
      activeClaims: active,
      staleClaims: stale,
      releasableClaims: releasable,
      releasedClaims: released,
      integrationQueue,
    };
  } finally {
    db.close();
  }
}
