import assert from "node:assert/strict";
import test from "node:test";
import { buildScopeViolations } from "../diff-guard-service.mjs";

function zone(id, globs) {
  return {
    id,
    name: id,
    risk: "medium",
    lockPolicy: "shared-disjoint",
    description: `${id} test zone`,
    globs,
    readStableDependencies: [],
    coClaimWith: [],
    verification: { commands: [], notes: "" },
  };
}

test("file matching multiple zones is rejected as ambiguous", () => {
  const { authorizedFiles, violations } = buildScopeViolations(
    ["apps/server/src/a.ts"],
    [zone("one", ["apps/**"]), zone("two", ["apps/server/**"])],
    new Set(["one"]),
  );

  assert.deepEqual(authorizedFiles, []);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, "ambiguous_zone");
  assert.deepEqual(violations[0].matchingZones, ["one", "two"]);
});

test("file matching no zone is rejected with no_matching_zone", () => {
  const { violations } = buildScopeViolations(["unknown/file.xyz"], [zone("one", ["apps/**"])], new Set(["one"]));

  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, "no_matching_zone");
});

test("file in an unclaimed zone is rejected with unclaimed_zone", () => {
  const { violations } = buildScopeViolations(["apps/server/src/a.ts"], [zone("one", ["apps/**"])], new Set(["other"]));

  assert.equal(violations.length, 1);
  assert.equal(violations[0].reason, "unclaimed_zone");
  assert.deepEqual(violations[0].matchingZones, ["one"]);
});

test("file in a claimed zone is authorized", () => {
  const { authorizedFiles, violations } = buildScopeViolations(["apps/server/src/a.ts"], [zone("one", ["apps/**"])], new Set(["one"]));

  assert.deepEqual(violations, []);
  assert.deepEqual(authorizedFiles, [{ file: "apps/server/src/a.ts", zone: "one" }]);
});
