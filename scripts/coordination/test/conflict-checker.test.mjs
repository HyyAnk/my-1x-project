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
