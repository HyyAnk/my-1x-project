import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const roots: string[] = [];
const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../scripts/audit-quiz-choice-count.mjs");

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("quiz choice artifact audit", () => {
  it("backs up and migrates a legacy fourth canonical answer into A–C", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "quiz-choice-audit-"));
    roots.push(root);
    const artifactDir = path.join(root, "channels", "demo");
    const artifact = path.join(artifactDir, "quiz.json");
    await mkdir(artifactDir, { recursive: true });
    await writeFile(
      artifact,
      JSON.stringify({
        questions: [
          {
            choices: [
              { id: "choice-a", text: "Alpha" },
              { id: "choice-b", text: "Beta" },
              { id: "choice-c", text: "Gamma" },
              { id: "choice-d", text: "Canonical Delta" },
            ],
            correct_choice_id: "choice-d",
          },
        ],
      }),
      "utf8",
    );

    const result = await execFileAsync(process.execPath, [script, "--fix"], { cwd: root, windowsHide: true });
    const migrated = JSON.parse(await readFile(artifact, "utf8")) as {
      questions: Array<{ choices: Array<{ id: string; text: string }>; correct_choice_id: string }>;
    };
    expect(migrated.questions[0].choices).toHaveLength(3);
    expect(migrated.questions[0].choices[2]).toEqual({ id: "choice-c", text: "Canonical Delta" });
    expect(migrated.questions[0].correct_choice_id).toBe("choice-c");
    expect(result.stdout).toContain("repaired=1");
    expect((await readdir(artifactDir)).some((name) => name.startsWith("quiz.json.quiz-choice-backup-"))).toBe(true);

    const cleanResult = await execFileAsync(process.execPath, [script], { cwd: root, windowsHide: true });
    expect(cleanResult.stdout).toContain("violations=0");
  });
});
