import assert from "node:assert/strict";
import test from "node:test";
import { classifyStagedFiles } from "../commit-gate.mjs";

function zone(id, globs = []) {
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

function claim(id, writeZones, agent = "agent-a") {
  return { id, agent, task: "fixture", status: "active", writeZones, readStableZones: [], plannedFiles: [] };
}

test("staged files owned by an active claim are blocked", () => {
  const result = classifyStagedFiles(
    ["apps/server/src/quiz/render/renderer.ts"],
    [claim("claim-1", ["render-implementation"])],
    [zone("render-implementation", ["apps/server/src/quiz/render/**"]), zone("server-tests", ["apps/server/test/**"])],
  );

  assert.equal(result.valid, false);
  assert.equal(result.blocked.length, 1);
  assert.equal(result.blocked[0].claim, "claim-1");
  assert.deepEqual(result.blocked[0].zones, ["render-implementation"]);
});

test("staged files matching no zone produce warnings but do not block", () => {
  const result = classifyStagedFiles(["some/unmapped/file.xyz"], [], [zone("render-implementation", ["apps/**"])]);

  assert.equal(result.valid, true);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].file, "some/unmapped/file.xyz");
  assert.equal(result.allowed.length, 0);
});

test("staged files outside active claims are allowed", () => {
  const result = classifyStagedFiles(
    ["apps/server/test/quiz.test.ts", "apps/web/src/features/stage/Stage.tsx"],
    [claim("claim-1", ["render-implementation"])],
    [
      zone("render-implementation", ["apps/server/src/quiz/render/**"]),
      zone("server-tests", ["apps/server/test/**"]),
      zone("web-layout-style", ["apps/web/src/features/**"]),
    ],
  );

  assert.equal(result.valid, true);
  assert.equal(result.blocked.length, 0);
  assert.equal(result.allowed.length, 2);
});

test("staged file matching multiple zones is blocked by the first owning claim", () => {
  const zones = [zone("overlap-a", ["src/**"]), zone("overlap-b", ["src/**"])];
  const result = classifyStagedFiles(["src/file.ts"], [claim("claim-a", ["overlap-a"]), claim("claim-b", ["overlap-b"])], zones);

  assert.equal(result.valid, false);
  assert.equal(result.blocked.length, 1);
});
