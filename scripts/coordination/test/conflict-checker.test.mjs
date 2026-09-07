import assert from "node:assert/strict";
import test from "node:test";
import { validateAndCheckConflicts } from "../conflict-checker.mjs";

function zone(id, lockPolicy = "exclusive") {
  return {
    id,
    name: id,
    risk: "medium",
    lockPolicy,
    description: `${id} test zone`,
    globs: [],
    readStableDependencies: [],
    verification: { commands: [], notes: "" },
  };
}

function activeClaim(id, overrides = {}) {
  const now = Date.now();
  return {
    id,
    agent: "agent-a",
    task: "fixture task",
    status: "active",
    createdAt: new Date(now - 10 * 60 * 1000).toISOString(),
    updatedAt: new Date(now - 10 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 110 * 60 * 1000).toISOString(),
    lastHeartbeatAt: new Date(now - 60 * 1000).toISOString(),
    heartbeatTimeoutMinutes: 15,
    writeZones: [],
    readStableZones: [],
    plannedFiles: [],
    ...overrides,
  };
}

test("TTL-expired active claims do not block new claims", () => {
  const expired = activeClaim("claim-expired", {
    expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    writeZones: ["contracts"],
  });

  const result = validateAndCheckConflicts([zone("contracts")], [expired], {
    writeZones: ["contracts"],
    readStableZones: [],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.conflicts, []);
});

test("Heartbeat-dead claims with unexpired TTL do not block new claims", () => {
  const stale = activeClaim("claim-stale-heartbeat", {
    lastHeartbeatAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    writeZones: ["contracts"],
  });

  const result = validateAndCheckConflicts([zone("contracts")], [stale], {
    writeZones: ["contracts"],
    readStableZones: [],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.conflicts, []);
});

test("Live claims still conflict on exclusive zones", () => {
  const live = activeClaim("claim-live", { writeZones: ["contracts"] });

  const result = validateAndCheckConflicts([zone("contracts")], [live], {
    writeZones: ["contracts"],
    readStableZones: [],
  });

  assert.equal(result.valid, false);
  assert.ok(result.conflicts.some((conflict) => conflict.includes('Zone "contracts" is exclusive')));
});

test("Live shared-disjoint claims still conflict on overlapping planned files", () => {
  const impl = zone("impl", "shared-disjoint");
  const live = activeClaim("claim-impl", {
    writeZones: ["impl"],
    plannedFiles: ["apps/server/src/quiz/render/renderer.ts"],
  });

  const overlapping = validateAndCheckConflicts([impl], [live], {
    writeZones: ["impl"],
    readStableZones: [],
    plannedFiles: ["apps/server/src/quiz/render/renderer.ts"],
  });
  assert.equal(overlapping.valid, false);

  const disjoint = validateAndCheckConflicts([impl], [live], {
    writeZones: ["impl"],
    readStableZones: [],
    plannedFiles: ["apps/server/src/quiz/render/other.ts"],
  });
  assert.equal(disjoint.valid, true);
});

test("shared-layout-contracts allows concurrent writers on disjoint files and rejects overlaps", () => {
  const layoutContracts = zone("shared-layout-contracts", "shared-disjoint");
  const activeLayoutClaim = activeClaim("claim-layout-agent-1", {
    writeZones: ["shared-layout-contracts"],
    plannedFiles: ["packages/shared/src/quizLayouts.catalog.ts"],
  });

  // Candidate with disjoint file should succeed
  const disjoint = validateAndCheckConflicts([layoutContracts], [activeLayoutClaim], {
    writeZones: ["shared-layout-contracts"],
    readStableZones: [],
    plannedFiles: ["packages/shared/src/quizStyles/cssVariables.ts"],
  });
  assert.equal(disjoint.valid, true);
  assert.deepEqual(disjoint.conflicts, []);

  // Candidate with overlapping file should fail
  const overlapping = validateAndCheckConflicts([layoutContracts], [activeLayoutClaim], {
    writeZones: ["shared-layout-contracts"],
    readStableZones: [],
    plannedFiles: ["packages/shared/src/quizLayouts.catalog.ts"],
  });
  assert.equal(overlapping.valid, false);
  assert.ok(overlapping.conflicts.some((c) => c.includes("overlapping planned files")));
});

test("shared-mascot-contracts allows concurrent writers on disjoint files and rejects overlaps", () => {
  const mascotContracts = zone("shared-mascot-contracts", "shared-disjoint");
  const activeMascotClaim = activeClaim("claim-mascot-agent-1", {
    writeZones: ["shared-mascot-contracts"],
    plannedFiles: ["packages/shared/src/enums/mascot.ts"],
  });

  // Candidate with disjoint file should succeed
  const disjoint = validateAndCheckConflicts([mascotContracts], [activeMascotClaim], {
    writeZones: ["shared-mascot-contracts"],
    readStableZones: [],
    plannedFiles: ["packages/shared/src/presets.ts"],
  });
  assert.equal(disjoint.valid, true);
  assert.deepEqual(disjoint.conflicts, []);

  // Candidate with overlapping file should fail
  const overlapping = validateAndCheckConflicts([mascotContracts], [activeMascotClaim], {
    writeZones: ["shared-mascot-contracts"],
    readStableZones: [],
    plannedFiles: ["packages/shared/src/enums/mascot.ts"],
  });
  assert.equal(overlapping.valid, false);
  assert.ok(overlapping.conflicts.some((c) => c.includes("overlapping planned files")));
});
