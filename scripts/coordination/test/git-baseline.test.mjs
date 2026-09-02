import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { claimZone, getStatus } from "../claim-service.mjs";
import { captureGitBaseline, compareGitStates } from "../git-baseline.mjs";
import { createGitFixture, createTempDbPath, removeGitFixture, removeSqliteFiles, runGit } from "./test-fixture.mjs";

test("a clean checkout produces an empty hash-aware baseline", () => {
  const root = createGitFixture("clean-baseline");
  try {
    const baseline = captureGitBaseline(root);
    assert.deepEqual(baseline.changedFiles, []);
    assert.deepEqual(baseline.fileFingerprints, {});
    assert.match(baseline.repositoryFingerprint, /^[a-f0-9]{64}$/);
  } finally {
    removeGitFixture(root);
  }
});

test("claim persistence retains file and repository fingerprints", () => {
  const root = createGitFixture("persisted-baseline");
  const dbPath = createTempDbPath("persisted-baseline");
  try {
    const fixturePath = path.join(root, "apps", "web", "src", "components", "Fixture.tsx");
    fs.writeFileSync(fixturePath, "export const value = 5;\n");
    const claim = claimZone({
      agent: "fingerprint-owner",
      task: "persist fingerprints",
      writeZones: ["web-layout-style"],
      claimId: "persisted-baseline",
      workspaceRoot: root,
      customDbPath: dbPath,
    });
    const persisted = getStatus({ claimId: claim.id, workspaceRoot: root, customDbPath: dbPath }).claim;
    assert.equal(persisted.baseline.baseRevision, claim.baseRevision);
    assert.match(persisted.baseline.repositoryFingerprint, /^[a-f0-9]{64}$/);
    assert.match(persisted.baseline.fileFingerprints["apps/web/src/components/Fixture.tsx"].hash, /^[a-f0-9]{64}$/);
  } finally {
    removeSqliteFiles(dbPath);
    removeGitFixture(root);
  }
});

test("content hashes distinguish an unchanged dirty file from a later edit", () => {
  const root = createGitFixture("dirty-baseline");
  const fixturePath = path.join(root, "apps", "web", "src", "components", "Fixture.tsx");
  try {
    fs.writeFileSync(fixturePath, "export const value = 2;\n");
    const baseline = captureGitBaseline(root);
    const unchanged = compareGitStates(baseline, captureGitBaseline(root));
    assert.deepEqual(unchanged.changedSinceBaseline, []);
    assert.deepEqual(unchanged.unchangedBaselineFiles, ["apps/web/src/components/Fixture.tsx"]);

    fs.writeFileSync(fixturePath, "export const value = 3;\n");
    const changed = compareGitStates(baseline, captureGitBaseline(root));
    assert.deepEqual(changed.changedSinceBaseline, ["apps/web/src/components/Fixture.tsx"]);
  } finally {
    removeGitFixture(root);
  }
});

test("a Git HEAD change invalidates the captured state", () => {
  const root = createGitFixture("head-change");
  const fixturePath = path.join(root, "apps", "web", "src", "components", "Fixture.tsx");
  try {
    const baseline = captureGitBaseline(root);
    fs.writeFileSync(fixturePath, "export const value = 4;\n");
    runGit(root, ["add", "."]);
    runGit(root, ["commit", "-m", "move head"]);
    const comparison = compareGitStates(baseline, captureGitBaseline(root));
    assert.equal(comparison.headChanged, true);
  } finally {
    removeGitFixture(root);
  }
});

test("untracked files are captured individually instead of collapsed directories", () => {
  const root = createGitFixture("untracked-files");
  try {
    const nestedDirectory = path.join(root, "apps", "web", "src", "components", "new");
    fs.mkdirSync(nestedDirectory, { recursive: true });
    fs.writeFileSync(path.join(nestedDirectory, "First.tsx"), "first\n");
    fs.writeFileSync(path.join(nestedDirectory, "Second.tsx"), "second\n");
    const baseline = captureGitBaseline(root);
    assert.deepEqual(baseline.changedFiles, ["apps/web/src/components/new/First.tsx", "apps/web/src/components/new/Second.tsx"]);
  } finally {
    removeGitFixture(root);
  }
});
