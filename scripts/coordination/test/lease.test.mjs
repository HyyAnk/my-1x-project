import assert from "node:assert/strict";
import test from "node:test";
import { claimZone, expandActiveClaim, getStatus, releaseActiveClaim } from "../claim-service.mjs";
import { verifyClaimScope } from "../diff-guard-service.mjs";
import { openClaimsDb } from "../db.mjs";
import { pulseHeartbeat } from "../heartbeat-service.mjs";
import { createTempDbPath, removeSqliteFiles, workspaceRoot } from "./test-fixture.mjs";

test("a new claim returns one lease token without exposing its hash through status", () => {
  const dbPath = createTempDbPath("lease-creation");
  try {
    const created = claimZone({
      agent: "lease-owner",
      task: "lease creation test",
      writeZones: ["shared-contracts"],
      claimId: "lease-creation",
      workspaceRoot,
      customDbPath: dbPath,
    });
    assert.equal(typeof created.leaseToken, "string");
    assert.ok(created.leaseToken.length >= 32);

    const status = getStatus({
      claimId: created.id,
      workspaceRoot,
      customDbPath: dbPath,
    });
    const serialized = JSON.stringify(status);
    assert.doesNotMatch(serialized, new RegExp(created.leaseToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(serialized, /leaseTokenHash/);
    assert.equal("leaseToken" in status.claim, false);
  } finally {
    removeSqliteFiles(dbPath);
  }
});

test("claim mutations require the matching lease token", () => {
  const dbPath = createTempDbPath("lease-authentication");
  try {
    const created = claimZone({
      agent: "lease-owner",
      task: "lease authentication test",
      writeZones: ["web-layout-style"],
      claimId: "lease-authentication",
      workspaceRoot,
      customDbPath: dbPath,
    });

    assert.throws(() => expandActiveClaim({ claimId: created.id, workspaceRoot, customDbPath: dbPath }), /lease token is required/i);
    assert.throws(
      () => pulseHeartbeat({ claimId: created.id, leaseToken: "wrong", workspaceRoot, customDbPath: dbPath }),
      /Lease token is invalid/,
    );
    assert.throws(
      () =>
        verifyClaimScope({
          claimId: created.id,
          leaseToken: "wrong",
          evidenceSummary: "test evidence",
          workspaceRoot,
          customDbPath: dbPath,
          changedFilesOverride: [],
        }),
      /Lease token is invalid/,
    );
    assert.throws(
      () =>
        releaseActiveClaim({
          claimId: created.id,
          leaseToken: "wrong",
          workspaceRoot,
          customDbPath: dbPath,
        }),
      /Lease token is invalid/,
    );

    const heartbeat = pulseHeartbeat({
      claimId: created.id,
      leaseToken: created.leaseToken,
      workspaceRoot,
      customDbPath: dbPath,
    });
    assert.equal(heartbeat.success, true);

    const expanded = expandActiveClaim({
      claimId: created.id,
      leaseToken: created.leaseToken,
      addPlannedFiles: ["apps/web/src/components/SecretFree.tsx"],
      workspaceRoot,
      customDbPath: dbPath,
    });
    assert.equal("leaseTokenHash" in expanded, false);

    verifyClaimScope({
      claimId: created.id,
      leaseToken: created.leaseToken,
      evidenceSummary: "lease response redaction passed",
      workspaceRoot,
      customDbPath: dbPath,
      changedFilesOverride: [],
    });
    const released = releaseActiveClaim({
      claimId: created.id,
      leaseToken: created.leaseToken,
      workspaceRoot,
      customDbPath: dbPath,
    });
    assert.equal("leaseTokenHash" in released, false);
  } finally {
    removeSqliteFiles(dbPath);
  }
});

test("legacy active claims without a token hash cannot be mutated", () => {
  const dbPath = createTempDbPath("legacy-lease");
  try {
    const created = claimZone({
      agent: "legacy-owner",
      task: "legacy lease test",
      writeZones: ["shared-contracts"],
      claimId: "legacy-lease",
      workspaceRoot,
      customDbPath: dbPath,
    });
    const db = openClaimsDb(workspaceRoot, dbPath);
    db.prepare("UPDATE claims SET lease_token_hash = NULL WHERE id = ?").run(created.id);
    db.close();

    assert.throws(
      () =>
        pulseHeartbeat({
          claimId: created.id,
          leaseToken: created.leaseToken,
          workspaceRoot,
          customDbPath: dbPath,
        }),
      /has no lease token and cannot be mutated/,
    );
  } finally {
    removeSqliteFiles(dbPath);
  }
});
