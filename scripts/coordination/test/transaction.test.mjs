import assert from "node:assert/strict";
import test from "node:test";
import { openClaimsDb } from "../db.mjs";
import { createTempDbPath, removeSqliteFiles, runClaimProcess, workspaceRoot } from "./test-fixture.mjs";

test("concurrent exclusive claims accept exactly one owner", async () => {
  const dbPath = createTempDbPath("agent-claim-race");
  const db = openClaimsDb(workspaceRoot, dbPath);
  db.close();

  try {
    const results = await Promise.all([
      runClaimProcess({ dbPath, claimId: "race-agent-a", writeZone: "shared-contracts" }),
      runClaimProcess({ dbPath, claimId: "race-agent-b", writeZone: "shared-contracts" }),
    ]);
    const accepted = results.filter((result) => result === "accepted");
    const rejected = results.filter((result) => result.startsWith("rejected:"));

    assert.equal(accepted.length, 1, `expected one accepted claim, received: ${results.join(" | ")}`);
    assert.equal(rejected.length, 1, `expected one rejected claim, received: ${results.join(" | ")}`);
    assert.match(rejected[0], /already claimed/);
    assert.doesNotMatch(rejected[0], /database is locked/i);
  } finally {
    removeSqliteFiles(dbPath);
  }
});
