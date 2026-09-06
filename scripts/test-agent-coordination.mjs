import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  claimZone,
  expandActiveClaim,
  releaseActiveClaim,
  rebaselineClaim,
  cleanupStaleActiveClaims,
  getStatus,
  findWorkspaceRoot,
  fileMatchesZone,
  findZonesForFile,
  inspectClaimScope,
  verifyClaimScope,
  pulseHeartbeat,
  isClaimDead,
  getIntegratorReport,
  openClaimsDb,
} from "./agent-coordination-registry.mjs";

const root = findWorkspaceRoot();
const testDbPath = path.join(root, ".agent-orchestrator", "state", `test-claims-${Date.now()}.db`);

function releaseClaim(claim, overrides = {}) {
  verifyClaimScope({
    claimId: claim.id,
    leaseToken: claim.leaseToken,
    evidenceSummary: "coordination compatibility test passed",
    workspaceRoot: root,
    customDbPath: testDbPath,
  });
  return releaseActiveClaim({
    claimId: claim.id,
    leaseToken: claim.leaseToken,
    workspaceRoot: root,
    customDbPath: testDbPath,
    ...overrides,
  });
}

test.before(() => {
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch {}
  }
});

test.after(() => {
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch {}
  }
});

test("Claim baseline captures git status snapshot", () => {
  const claim = claimZone({
    agent: "agent-alpha",
    task: "Testing baseline recording",
    writeZones: ["web-layout-style"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  try {
    assert.equal(claim.agent, "agent-alpha");
    assert.equal(claim.status, "active");
    assert.ok(claim.baseline, "baseline should exist");
    assert.ok(Array.isArray(claim.baseline.changedFiles), "changedFiles should be array");
    assert.ok(claim.baseline.changedFiles.length >= 0, "should capture baseline changedFiles array");
    assert.ok(claim.baseRevision, "should capture baseRevision");
  } finally {
    releaseClaim(claim);
  }
});

test("Co-claim advisory recommends companion zones", () => {
  const claim = claimZone({
    agent: "agent-coclaim",
    task: "Pipeline work without the tests claim",
    writeZones: ["server-pipeline"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  try {
    assert.ok(
      claim.advisories.some((advisory) => advisory.includes("server-tests")),
      "claiming server-pipeline should advise co-claiming server-tests",
    );
  } finally {
    releaseClaim(claim);
  }
});

test("Exclusive zone cannot be claimed by two active claims", () => {
  // Claim exclusive zone with Agent A
  const claimA = claimZone({
    agent: "agent-a",
    task: "Working on shared contracts",
    writeZones: ["shared-contracts"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });
  assert.ok(claimA.id);

  // Attempt to claim same exclusive zone with Agent B
  assert.throws(
    () => {
      claimZone({
        agent: "agent-b",
        task: "Conflicting work on shared contracts",
        writeZones: ["shared-contracts"],
        workspaceRoot: root,
        customDbPath: testDbPath,
      });
    },
    (err) => {
      assert.match(err.message, /Zone "shared-contracts" is exclusive and already claimed/);
      return true;
    },
  );

  releaseClaim(claimA);
});

test("Read-stable dependencies prevent conflicting write claims", () => {
  // Agent C claims server-pipeline, which has readStableDependencies: [shared-contracts, artifact-contracts, render-inputs]
  const claimC = claimZone({
    agent: "agent-c",
    task: "Pipeline refactoring",
    writeZones: ["server-pipeline"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });
  assert.ok(claimC.readStableZones.includes("render-inputs"));

  // Agent D tries to write render-inputs while Agent C depends on it staying read-stable
  assert.throws(
    () => {
      claimZone({
        agent: "agent-d",
        task: "Modifying render inputs",
        writeZones: ["render-inputs"],
        workspaceRoot: root,
        customDbPath: testDbPath,
      });
    },
    (err) => {
      assert.match(err.message, /cannot be claimed for write because active claim/);
      return true;
    },
  );

  releaseClaim(claimC);
});

test("Non-conflicting zones can be claimed independently", () => {
  const claim1 = claimZone({
    agent: "agent-leaf-1",
    task: "Work on candy arcade renderer",
    writeZones: ["render-implementation"],
    plannedFiles: ["apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  const claim2 = claimZone({
    agent: "agent-leaf-2",
    task: "Work on thumbnail prompts",
    writeZones: ["image-thumbnail-prompt"],
    plannedFiles: ["apps/server/src/quiz/thumbnail/thumbnailPromptCompiler.ts"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  assert.equal(claim1.status, "active");
  assert.equal(claim2.status, "active");

  releaseClaim(claim1);
  releaseClaim(claim2);
});

test("Claim can be expanded to include additional zones", () => {
  const claim = claimZone({
    agent: "agent-expander",
    task: "Initial scope",
    writeZones: ["web-api-state"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  assert.deepEqual(claim.writeZones, ["web-api-state"]);

  const expanded = expandActiveClaim({
    claimId: claim.id,
    leaseToken: claim.leaseToken,
    addWriteZones: ["web-layout-style"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  assert.ok(expanded.writeZones.includes("web-api-state"));
  assert.ok(expanded.writeZones.includes("web-layout-style"));

  releaseClaim(claim);
});

test("Claim can be released with verification summary", () => {
  const claim = claimZone({
    agent: "agent-releaser",
    task: "Temporary task",
    writeZones: ["web-layout-style"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  verifyClaimScope({
    claimId: claim.id,
    leaseToken: claim.leaseToken,
    evidenceSummary: "All component tests pass.",
    workspaceRoot: root,
    customDbPath: testDbPath,
  });
  const released = releaseActiveClaim({
    claimId: claim.id,
    leaseToken: claim.leaseToken,
    releasedBy: "agent-releaser",
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  assert.equal(released.status, "released");
  assert.ok(released.release.releasedAt);
  assert.equal(released.release.verificationSummary, "All component tests pass.");
});

test("Expired claims can be detected and cleaned", () => {
  const expiredClaim = claimZone({
    agent: "agent-stale",
    task: "Stale task",
    writeZones: ["artifact-contracts"],
    ttlMinutes: -1,
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  assert.equal(expiredClaim.status, "active");

  const cleanupResult = cleanupStaleActiveClaims({
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  assert.ok(cleanupResult.cleanedCount >= 1, "should have cleaned at least 1 expired claim");
  const updated = getStatus({
    claimId: expiredClaim.id,
    workspaceRoot: root,
    customDbPath: testDbPath,
  });
  assert.equal(updated.claim.status, "expired");
});

test("Diff-to-zone matching handles positive and negative patterns", () => {
  const zoneProgress = {
    id: "task-status-progress",
    globs: ["apps/server/src/tasks/**", "apps/web/src/components/TaskProgressPanel.tsx"],
  };

  const zoneWeb = {
    id: "web-layout-style",
    globs: ["apps/web/src/components/**", "!apps/web/src/components/TaskProgressPanel*"],
  };

  // Positive match
  assert.equal(fileMatchesZone("apps/server/src/tasks/imageRunner.ts", zoneProgress), true);

  // Negative exclusion match
  assert.equal(fileMatchesZone("apps/web/src/components/TaskProgressPanel.tsx", zoneWeb), false);
  assert.equal(fileMatchesZone("apps/web/src/components/TaskProgressPanel.tsx", zoneProgress), true);
  assert.equal(fileMatchesZone("apps/web/src/components/channel/ChannelCard.tsx", zoneWeb), true);
});

test("Diff guard passes when changed files match claimed write zones", () => {
  const claim = claimZone({
    agent: "agent-diff-pass",
    task: "Testing valid diff matching",
    writeZones: ["render-implementation"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  const result = inspectClaimScope({
    claimId: claim.id,
    workspaceRoot: root,
    customDbPath: testDbPath,
    changedFilesOverride: [
      "apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts",
      "apps/server/src/quiz/render/candyArcade/candyArcadeStyles.ts",
    ],
  });

  assert.equal(result.valid, true);
  assert.equal(result.violations.length, 0);
  assert.equal(result.authorizedFiles.length, 2);

  releaseClaim(claim);
});

test("Diff guard fails when a changed file is outside claimed write zones", () => {
  const claim = claimZone({
    agent: "agent-diff-fail",
    task: "Testing out-of-scope diff detection",
    writeZones: ["render-implementation"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  const result = inspectClaimScope({
    claimId: claim.id,
    workspaceRoot: root,
    customDbPath: testDbPath,
    changedFilesOverride: [
      "apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts",
      "apps/server/src/routes/newRoute.ts", // Belongs to api-contracts and not in baseline!
    ],
  });

  assert.equal(result.valid, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].file, "apps/server/src/routes/newRoute.ts");
  assert.ok(result.violations[0].matchingZones.includes("api-contracts"));
  assert.match(result.violations[0].action, /agent-expand/);

  releaseClaim(claim);
});

test("Diff guard ignores pre-existing baseline files that were not modified after claim", () => {
  const claim = claimZone({
    agent: "agent-diff-baseline",
    task: "Testing baseline exclusion",
    writeZones: ["web-layout-style"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  try {
    const baselineSample = "packages/shared/src/index.ts";
    const db = openClaimsDb(root, testDbPath);
    try {
      const baseline = claim.baseline || { baseRevision: "test", changedFiles: [] };
      if (!baseline.changedFiles.includes(baselineSample)) {
        baseline.changedFiles.push(baselineSample);
        db.prepare("UPDATE claims SET baseline_files = ? WHERE id = ?").run(JSON.stringify(baseline.changedFiles), claim.id);
      }
    } finally {
      db.close();
    }

    const result = inspectClaimScope({
      claimId: claim.id,
      workspaceRoot: root,
      customDbPath: testDbPath,
      changedFilesOverride: [
        baselineSample, // In baseline, not modified after claim -> should be ignored!
        "apps/web/src/components/channel/ChannelCard.tsx", // In claimed write zone
      ],
    });

    assert.equal(result.valid, true);
    assert.equal(result.violations.length, 0);
    assert.ok(result.ignoredBaselineFilesCount >= 1);
  } finally {
    releaseClaim(claim);
  }
});

test("Diff guard fails with clear message when file matches no zone", () => {
  const claim = claimZone({
    agent: "agent-diff-unknown",
    task: "Testing unzoned file",
    writeZones: ["web-layout-style"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  try {
    const result = inspectClaimScope({
      claimId: claim.id,
      workspaceRoot: root,
      customDbPath: testDbPath,
      changedFilesOverride: ["unknown-directory/unknown-file.txt"],
    });

    assert.equal(result.valid, false);
    assert.equal(result.violations.length, 1);
    assert.equal(result.violations[0].reason, "no_matching_zone");
    assert.match(result.violations[0].message, /does not match any zone/);
  } finally {
    releaseClaim(claim);
  }
});

test("Released claims cannot authorize new modifications", () => {
  const claim = claimZone({
    agent: "agent-diff-released",
    task: "Task before release",
    writeZones: ["web-layout-style"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  releaseClaim(claim);

  assert.throws(
    () => {
      verifyClaimScope({
        claimId: claim.id,
        leaseToken: claim.leaseToken,
        workspaceRoot: root,
        customDbPath: testDbPath,
      });
    },
    (err) => {
      assert.match(err.message, /already released and cannot authorize modifications/);
      return true;
    },
  );
});

test("Stale heartbeat is detected as dead claim", () => {
  const claim = claimZone({
    agent: "agent-timeout",
    task: "Task with short heartbeat timeout",
    writeZones: ["web-api-state"],
    heartbeatTimeoutMinutes: 5,
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  // Check 10 minutes into the future
  const futureDate = new Date(Date.now() + 10 * 60 * 1000);
  const deadCheck = isClaimDead(claim, futureDate);

  assert.equal(deadCheck.isDead, true);
  assert.equal(deadCheck.reason, "heartbeat_timeout");

  releaseClaim(claim);
});

test("Heartbeat-dead claim does not block new claims of the same exclusive zone", () => {
  const stale = claimZone({
    agent: "agent-stale",
    task: "Abandoned task with dead heartbeat",
    writeZones: ["shared-contracts"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  // Backdate the heartbeat beyond the timeout so the claim is dead but its TTL is still valid.
  const db = openClaimsDb(root, testDbPath);
  try {
    db.prepare("UPDATE claims SET last_heartbeat_at = ? WHERE id = ?").run(new Date(Date.now() - 30 * 60 * 1000).toISOString(), stale.id);
  } finally {
    db.close();
  }

  const takeover = claimZone({
    agent: "agent-takeover",
    task: "Takes over the abandoned exclusive zone",
    writeZones: ["shared-contracts"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });
  assert.ok(takeover.id);

  releaseClaim(stale);
  releaseClaim(takeover);
});

test("Rebaseline refreshes the baseline and clears verification", () => {
  const claim = claimZone({
    agent: "agent-rebase",
    task: "Claim that needs a fresh baseline",
    writeZones: ["shared-contracts"],
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  // Simulate concurrent released work: a foreign untracked file appears after the claim baseline.
  const foreignFile = path.join(root, "apps", "server", "test", `rebaseline-fixture-${Date.now()}.txt`);
  fs.writeFileSync(foreignFile, "concurrent work\n");

  try {
    const before = verifyClaimScope({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      evidenceSummary: "verification that should be invalidated by the foreign change",
      workspaceRoot: root,
      customDbPath: testDbPath,
    });
    assert.equal(before.valid, false, "foreign post-baseline change must fail verification before rebaseline");

    const rebaselined = rebaselineClaim({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      workspaceRoot: root,
      customDbPath: testDbPath,
    });
    assert.ok(rebaselined.baseline.changedFiles.length > 0, "fresh baseline must capture the foreign dirty file");
    assert.equal(rebaselined.verification, null, "rebaseline must clear stored verification");
    assert.ok(rebaselined.lastHeartbeatAt);

    const after = verifyClaimScope({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      evidenceSummary: "verification passes after rebaseline scoping",
      workspaceRoot: root,
      customDbPath: testDbPath,
    });
    assert.equal(after.valid, true, "verification must pass once the foreign change is part of the baseline");

    releaseClaim(claim);
  } finally {
    if (fs.existsSync(foreignFile)) fs.unlinkSync(foreignFile);
  }
});

test("Live heartbeat refreshes timestamp and prevents accidental cleanup", () => {
  const claim = claimZone({
    agent: "agent-lively",
    task: "Long running lively task",
    writeZones: ["web-api-state"],
    heartbeatTimeoutMinutes: 15,
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  const heartbeatResult = pulseHeartbeat({
    claimId: claim.id,
    leaseToken: claim.leaseToken,
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  assert.equal(heartbeatResult.success, true);
  assert.ok(heartbeatResult.lastHeartbeatAt);

  const cleanup = cleanupStaleActiveClaims({
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  // Should NOT have cleaned agent-lively
  const status = getStatus({
    claimId: claim.id,
    workspaceRoot: root,
    customDbPath: testDbPath,
  });
  assert.equal(status.claim.status, "active");

  releaseClaim(claim);
});

test("Write claim conflicts with active claim holding zone as read-stable", () => {
  const readerClaim = claimZone({
    agent: "agent-reader",
    task: "Task depending on read stability of shared contracts",
    writeZones: ["server-pipeline"], // Declares readStableDependencies: [shared-contracts, ...]
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  assert.ok(readerClaim.readStableZones.includes("shared-contracts"));

  assert.throws(
    () => {
      claimZone({
        agent: "agent-writer",
        task: "Conflicting write on shared contracts",
        writeZones: ["shared-contracts"],
        workspaceRoot: root,
        customDbPath: testDbPath,
      });
    },
    (err) => {
      assert.match(err.message, /cannot be claimed for write because active claim/);
      assert.match(err.message, /depends on it staying read-stable/);
      return true;
    },
  );

  releaseClaim(readerClaim);
});

test("Integrator report organizes claims and integration queue order", () => {
  const claimLowPri = claimZone({
    agent: "agent-low",
    task: "Low priority task",
    writeZones: ["render-implementation"],
    queuePriority: 200,
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  const claimHighPri = claimZone({
    agent: "agent-high",
    task: "High priority task",
    writeZones: ["image-thumbnail-prompt"],
    queuePriority: 50,
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  const report = getIntegratorReport({
    workspaceRoot: root,
    customDbPath: testDbPath,
  });

  assert.ok(report.summary.activeCount >= 2);
  assert.ok(report.integrationQueue.length >= 2);

  // High priority should come before low priority in integration queue
  const highIdx = report.integrationQueue.findIndex((c) => c.id === claimHighPri.id);
  const lowIdx = report.integrationQueue.findIndex((c) => c.id === claimLowPri.id);

  assert.ok(highIdx !== -1 && lowIdx !== -1);
  assert.ok(highIdx < lowIdx, "High priority claim should appear earlier in queue");

  releaseClaim(claimLowPri);
  releaseClaim(claimHighPri);
});
