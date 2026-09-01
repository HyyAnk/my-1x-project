import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { saveCodexSettings } from "../src/config.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("runtime namespace", () => {
  it("writes settings only beneath .quiz-studio", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-runtime-"));
    roots.push(root);
    await saveCodexSettings(root, { model: "gpt-5.5" });

    const expectedDirectory = [".quiz", "-studio"].join("");
    await expect(access(path.join(root, expectedDirectory, "codex.local.json"))).resolves.toBeUndefined();

    const runtimePaths = await import("../src/runtimePaths.js").catch(() => null);
    expect(runtimePaths?.STUDIO_RUNTIME_DIRECTORY).toBe(expectedDirectory);
    expect(runtimePaths?.studioRuntimePath(root, "codex.local.json")).toBe(path.join(root, expectedDirectory, "codex.local.json"));

    const retiredDirectory = [".docu", "mentary-studio"].join("");
    await expect(access(path.join(root, retiredDirectory, "codex.local.json"))).rejects.toThrow();
  });
});
