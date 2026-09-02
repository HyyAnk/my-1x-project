import assert from "node:assert/strict";
import test from "node:test";
import { claimZone } from "../claim-service.mjs";
import { createTempDbPath, removeSqliteFiles, workspaceRoot } from "./test-fixture.mjs";

function withTempDb(label, operation) {
  const dbPath = createTempDbPath(label);
  try {
    return operation(dbPath);
  } finally {
    removeSqliteFiles(dbPath);
  }
}

function createWebClaim(dbPath, overrides) {
  return claimZone({
    agent: overrides.claimId,
    task: "path ownership test",
    writeZones: ["web-layout-style"],
    workspaceRoot,
    customDbPath: dbPath,
    ...overrides,
  });
}

test("shared-disjoint claims without planned files conflict as whole-zone ownership", () => {
  withTempDb("whole-zone-conflict", (dbPath) => {
    createWebClaim(dbPath, { claimId: "whole-zone-a" });
    assert.throws(() => createWebClaim(dbPath, { claimId: "whole-zone-b" }), /claims the whole shared-disjoint zone/);
  });
});

test("shared-disjoint claims reject wildcard planned paths", () => {
  withTempDb("wildcard-path", (dbPath) => {
    assert.throws(
      () =>
        createWebClaim(dbPath, {
          claimId: "wildcard-owner",
          plannedFiles: ["apps/web/src/components/**"],
        }),
      /must be a concrete repository-relative file path/,
    );
  });
});

test("shared-disjoint claims normalize separators and Windows path case", () => {
  withTempDb("normalized-overlap", (dbPath) => {
    createWebClaim(dbPath, {
      claimId: "normalized-a",
      plannedFiles: ["apps/web/src/components/channel/ChannelCard.tsx"],
    });
    assert.throws(
      () =>
        createWebClaim(dbPath, {
          claimId: "normalized-b",
          plannedFiles: ["APPS\\WEB\\SRC\\COMPONENTS\\CHANNEL\\channelcard.tsx"],
        }),
      /overlapping planned files/,
    );
  });
});

test("shared-disjoint claims accept disjoint concrete files", () => {
  withTempDb("disjoint-paths", (dbPath) => {
    const first = createWebClaim(dbPath, {
      claimId: "disjoint-a",
      plannedFiles: ["apps/web/src/components/channel/ChannelCard.tsx"],
    });
    const second = createWebClaim(dbPath, {
      claimId: "disjoint-b",
      plannedFiles: ["apps/web/src/components/channel/ChannelCardMenu.tsx"],
    });
    assert.equal(first.status, "active");
    assert.equal(second.status, "active");
  });
});

test("planned files must belong to a claimed write zone", () => {
  withTempDb("outside-zone", (dbPath) => {
    assert.throws(
      () =>
        createWebClaim(dbPath, {
          claimId: "outside-zone-owner",
          plannedFiles: ["apps/server/src/routes/quizV2.ts"],
        }),
      /does not belong to a claimed write zone/,
    );
  });
});
