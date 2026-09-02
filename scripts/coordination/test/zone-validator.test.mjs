import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadZoneMap } from "../zone-loader.mjs";
import { auditZoneCoverage, validateZoneDefinitions } from "../zone-validator.mjs";
import { createGitFixture, removeGitFixture, workspaceRoot } from "./test-fixture.mjs";

function zone(id, globs, overrides = {}) {
  return {
    id,
    name: id,
    risk: "medium",
    lockPolicy: "shared-disjoint",
    description: `${id} test zone`,
    globs,
    readStableDependencies: [],
    verification: { commands: [], notes: "" },
    ...overrides,
  };
}

test("zone validation rejects duplicate IDs, invalid policies, missing dependencies, and negative-only globs", () => {
  const result = validateZoneDefinitions([
    zone("duplicate", ["apps/**"]),
    zone("duplicate", ["packages/**"], { lockPolicy: "invalid" }),
    zone("negative-only", ["!services/private/**"], { readStableDependencies: ["missing"] }),
  ]);

  assert.equal(result.valid, false);
  assert.ok(result.definitionErrors.some((error) => error.code === "duplicate_id"));
  assert.ok(result.definitionErrors.some((error) => error.code === "invalid_lock_policy"));
  assert.ok(result.definitionErrors.some((error) => error.code === "missing_dependency"));
  assert.ok(result.definitionErrors.some((error) => error.code === "negative_only_globs"));
});

test("zone coverage reports unmapped files and unexpected overlaps", () => {
  const root = createGitFixture("zone-coverage-errors");
  try {
    const extra = path.join(root, "apps", "web", "src", "unmapped.ts");
    fs.writeFileSync(extra, "export {}\n");
    const result = auditZoneCoverage({
      workspaceRoot: root,
      zoneList: [zone("first", ["apps/web/src/components/**"]), zone("second", ["apps/web/src/components/Fixture.tsx"])],
    });

    assert.deepEqual(result.unmappedFiles, ["apps/web/src/unmapped.ts"]);
    assert.deepEqual(result.overlappingFiles, [{ file: "apps/web/src/components/Fixture.tsx", zones: ["first", "second"] }]);
    assert.equal(result.valid, false);
  } finally {
    removeGitFixture(root);
  }
});

test("real repository product paths have complete unambiguous zone coverage", () => {
  const result = auditZoneCoverage({ workspaceRoot, zoneList: loadZoneMap(workspaceRoot) });
  assert.deepEqual(result.unmappedFiles, []);
  assert.deepEqual(result.overlappingFiles, []);
  assert.equal(result.valid, true);
});
