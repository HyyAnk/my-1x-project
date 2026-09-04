import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isIgnoredPath, FastZoneMatcher, CodebaseFileWatcher } from "../file-watcher.mjs";
import { findWorkspaceRoot } from "../workspace-root.mjs";

test("isIgnoredPath filters out build artifacts, dependencies, and temporary files", () => {
  assert.equal(isIgnoredPath("node_modules/express/index.js"), true);
  assert.equal(isIgnoredPath(".git/HEAD"), true);
  assert.equal(isIgnoredPath("dist/bundle.js"), true);
  assert.equal(isIgnoredPath(".turbo/cache/123"), true);
  assert.equal(isIgnoredPath("coordination.db"), true);
  assert.equal(isIgnoredPath("coordination.db-journal"), true);
  assert.equal(isIgnoredPath("apps/server/server.log"), true);
  assert.equal(isIgnoredPath("apps/web/src/temp.tmp"), true);

  // Valid source files must NOT be ignored
  assert.equal(isIgnoredPath("apps/server/src/routes/episodes.ts"), false);
  assert.equal(isIgnoredPath("apps/web/src/App.tsx"), false);
  assert.equal(isIgnoredPath("packages/shared/src/index.ts"), false);
  assert.equal(isIgnoredPath("scripts/coordination/file-watcher.mjs"), false);
});

test("FastZoneMatcher correctly matches files to zones and identifies dependencies", () => {
  const rootDir = findWorkspaceRoot();
  const matcher = FastZoneMatcher.fromWorkspace(rootDir);

  const serverRouteMatch = matcher.match("apps/server/src/routes/episodes.ts");
  assert.ok(serverRouteMatch, "Must match a zone");
  assert.equal(serverRouteMatch.zoneId, "api-contracts");
  assert.equal(serverRouteMatch.risk, "high");

  const webAppMatch = matcher.match("apps/web/src/App.tsx");
  assert.ok(webAppMatch, "Must match a zone");
  assert.equal(webAppMatch.zoneId, "web-layout-style");

  const sharedMatch = matcher.match("packages/shared/src/types.ts");
  assert.ok(sharedMatch, "Must match a zone");
  assert.equal(sharedMatch.zoneId, "shared-contracts");
});

test("CodebaseFileWatcher batches multiple file events with debounce window", async () => {
  const rootDir = findWorkspaceRoot();
  let receivedBatches = [];

  const watcher = new CodebaseFileWatcher({
    rootDir,
    debounceMs: 30,
    onActivity: (activities) => {
      receivedBatches.push(activities);
    },
  });

  // Simulate raw file events
  watcher.handleRawFileEvent("change", "apps/server/src/routes/episodes.ts");
  watcher.handleRawFileEvent("change", "apps/web/src/App.tsx");
  watcher.handleRawFileEvent("change", "apps/server/src/routes/episodes.ts"); // duplicate

  assert.equal(receivedBatches.length, 0, "Should not dispatch synchronously before debounce");

  // Wait for debounce flush
  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.equal(receivedBatches.length, 1, "Should dispatch exactly 1 batched activity list");
  assert.equal(receivedBatches[0].length, 2, "Duplicate file event should be deduplicated");

  const [act1, act2] = receivedBatches[0];
  assert.equal(act1.zoneId, "api-contracts");
  assert.equal(act1.fileName, "episodes.ts");
  assert.equal(act2.zoneId, "web-layout-style");
  assert.equal(act2.fileName, "App.tsx");

  watcher.stop();
});

test("CodebaseFileWatcher start and stop cleanly manages watcher handles and stats", () => {
  const rootDir = findWorkspaceRoot();
  const watcher = new CodebaseFileWatcher({ rootDir });

  watcher.start();
  let stats = watcher.getStats();
  assert.equal(stats.isWatching, true);
  assert.ok(stats.activeWatchers >= 1, "Must have active watchers");

  watcher.stop();
  stats = watcher.getStats();
  assert.equal(stats.isWatching, false);
  assert.equal(stats.activeWatchers, 0);
});
