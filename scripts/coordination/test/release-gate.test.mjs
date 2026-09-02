import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { claimZone, releaseActiveClaim } from "../claim-service.mjs";
import { verifyClaimScope } from "../diff-guard-service.mjs";
import { createGitFixture, createTempDbPath, removeGitFixture, removeSqliteFiles, runGit } from "./test-fixture.mjs";

function withClaim(label, operation) {
  const root = createGitFixture(label);
  const dbPath = createTempDbPath(label);
  const claim = claimZone({
    agent: `${label}-owner`,
    task: label,
    writeZones: ["web-layout-style"],
    plannedFiles: ["apps/web/src/components/Fixture.tsx"],
    claimId: label,
    workspaceRoot: root,
    customDbPath: dbPath,
  });
  try {
    return operation({ root, dbPath, claim });
  } finally {
    removeSqliteFiles(dbPath);
    removeGitFixture(root);
  }
}

test("release rejects a claim without successful verification evidence", () => {
  withClaim("release-without-verification", ({ root, dbPath, claim }) => {
    assert.throws(
      () =>
        releaseActiveClaim({
          claimId: claim.id,
          leaseToken: claim.leaseToken,
          workspaceRoot: root,
          customDbPath: dbPath,
        }),
      /successful verification record/,
    );
  });
});

test("successful verification requires a non-empty evidence summary", () => {
  withClaim("empty-verification-evidence", ({ root, dbPath, claim }) => {
    assert.throws(
      () =>
        verifyClaimScope({
          claimId: claim.id,
          leaseToken: claim.leaseToken,
          evidenceSummary: "   ",
          workspaceRoot: root,
          customDbPath: dbPath,
        }),
      /evidence summary is required/i,
    );
  });
});

test("a failed scope verification cannot be released", () => {
  withClaim("failed-verification-release", ({ root, dbPath, claim }) => {
    const verification = verifyClaimScope({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      evidenceSummary: "tests passed",
      workspaceRoot: root,
      customDbPath: dbPath,
      changedFilesOverride: ["apps/server/src/routes/outside.ts"],
    });
    assert.equal(verification.valid, false);
    assert.throws(
      () =>
        releaseActiveClaim({
          claimId: claim.id,
          leaseToken: claim.leaseToken,
          workspaceRoot: root,
          customDbPath: dbPath,
        }),
      /successful verification record/,
    );
  });
});

test("fresh verified in-scope changes can be released", () => {
  withClaim("verified-release", ({ root, dbPath, claim }) => {
    const file = path.join(root, "apps", "web", "src", "components", "Fixture.tsx");
    fs.writeFileSync(file, "export const value = 8;\n");
    const verification = verifyClaimScope({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      evidenceSummary: "node --test coordination: passed",
      workspaceRoot: root,
      customDbPath: dbPath,
    });
    assert.equal(verification.valid, true);
    assert.match(verification.repositoryFingerprint, /^[a-f0-9]{64}$/);

    const released = releaseActiveClaim({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      workspaceRoot: root,
      customDbPath: dbPath,
    });
    assert.equal(released.status, "released");
    assert.deepEqual(released.release.filesChanged, ["apps/web/src/components/Fixture.tsx"]);
  });
});

test("release records a pre-existing dirty file when its content changes during the claim", () => {
  const root = createGitFixture("dirty-file-release");
  const dbPath = createTempDbPath("dirty-file-release");
  const file = path.join(root, "apps", "web", "src", "components", "Fixture.tsx");
  try {
    fs.writeFileSync(file, "export const value = 20;\n");
    const claim = claimZone({
      agent: "dirty-file-owner",
      task: "modify a dirty file",
      writeZones: ["web-layout-style"],
      plannedFiles: ["apps/web/src/components/Fixture.tsx"],
      claimId: "dirty-file-release",
      workspaceRoot: root,
      customDbPath: dbPath,
    });
    fs.writeFileSync(file, "export const value = 21;\n");
    verifyClaimScope({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      evidenceSummary: "dirty-file regression passed",
      workspaceRoot: root,
      customDbPath: dbPath,
    });
    const released = releaseActiveClaim({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      workspaceRoot: root,
      customDbPath: dbPath,
    });
    assert.deepEqual(released.release.filesChanged, ["apps/web/src/components/Fixture.tsx"]);
  } finally {
    removeSqliteFiles(dbPath);
    removeGitFixture(root);
  }
});

test("release rejects repository changes made after verification", () => {
  withClaim("stale-verification", ({ root, dbPath, claim }) => {
    const file = path.join(root, "apps", "web", "src", "components", "Fixture.tsx");
    fs.writeFileSync(file, "export const value = 9;\n");
    verifyClaimScope({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      evidenceSummary: "tests passed before later edit",
      workspaceRoot: root,
      customDbPath: dbPath,
    });
    fs.writeFileSync(file, "export const value = 10;\n");
    assert.throws(
      () =>
        releaseActiveClaim({
          claimId: claim.id,
          leaseToken: claim.leaseToken,
          workspaceRoot: root,
          customDbPath: dbPath,
        }),
      /verification is stale/i,
    );
  });
});

test("a changed HEAD is reported as a scope violation", () => {
  withClaim("head-change-violation", ({ root, dbPath, claim }) => {
    const file = path.join(root, "apps", "web", "src", "components", "Fixture.tsx");
    fs.writeFileSync(file, "export const value = 11;\n");
    runGit(root, ["add", "."]);
    runGit(root, ["commit", "-m", "unexpected commit"]);
    const result = verifyClaimScope({
      claimId: claim.id,
      leaseToken: claim.leaseToken,
      evidenceSummary: "tests passed",
      workspaceRoot: root,
      customDbPath: dbPath,
    });
    assert.equal(result.valid, false);
    assert.ok(result.violations.some((violation) => violation.reason === "head_changed"));
  });
});
