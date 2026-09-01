import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const roots: string[] = [];
const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../scripts/audit-quiz-only.mjs");

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function trackedFixture(content: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-only-audit-"));
  roots.push(root);
  await writeFile(path.join(root, "tracked.txt"), content, "utf8");
  await execFileAsync("git", ["init", "--quiet"], { cwd: root, windowsHide: true });
  await execFileAsync("git", ["add", "tracked.txt"], { cwd: root, windowsHide: true });
  return root;
}

describe("Quiz-only tracked-source audit summary", () => {
  it("reports start time and complete success counters", async () => {
    const root = await trackedFixture("Quiz-only source\n");
    const result = await execFileAsync(process.execPath, [script], { cwd: root, windowsHide: true });

    expect(result.stderr).toMatch(/started_at=\d{4}-\d{2}-\d{2}T/);
    expect(result.stderr).toMatch(/total=1 success=1 failed=0 skipped=0 retries=0 elapsed=\d+ms/i);
  });

  it("reports complete failure counters", async () => {
    const root = await trackedFixture(["docu", "mentary"].join(""));
    const error = await execFileAsync(process.execPath, [script], { cwd: root, windowsHide: true }).catch(
      (reason: { stderr?: string; code?: number }) => reason,
    );

    expect(error).toHaveProperty("code", 1);
    expect(error.stderr).toMatch(/total=1 success=0 failed=1 skipped=0 retries=0 elapsed=\d+ms/i);
  });
});
