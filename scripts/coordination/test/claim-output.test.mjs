import assert from "node:assert/strict";
import test from "node:test";
import { createClaimCliResult } from "../claim-output.mjs";

test("claim JSON keeps the one-time token while compacting the baseline", () => {
  const result = createClaimCliResult({
    id: "claim-1",
    agent: "codex",
    task: "compact response",
    status: "active",
    expiresAt: "2026-09-02T10:00:00.000Z",
    writeZones: ["agent-coordination"],
    readStableZones: [],
    plannedFiles: ["scripts/agent-claim.mjs"],
    verificationRequired: ["node --test"],
    leaseToken: "one-time-secret",
    baseline: {
      baseRevision: "abc123",
      changedFiles: ["one.ts", "two.ts"],
      fileFingerprints: { "one.ts": { hash: "secret-detail" } },
      repositoryFingerprint: "repo-fingerprint",
    },
  });

  assert.equal(result.leaseToken, "one-time-secret");
  assert.deepEqual(result.baseline, {
    baseRevision: "abc123",
    repositoryFingerprint: "repo-fingerprint",
    dirtyFileCount: 2,
  });
  assert.doesNotMatch(JSON.stringify(result), /fileFingerprints|secret-detail|one\.ts|two\.ts/);
});
