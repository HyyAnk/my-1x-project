import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const roots: string[] = [];
const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../scripts/migrate-quiz-only.ps1");
const retiredRuntimeName = [".docu", "mentary-studio"].join("");
const targetRuntimeName = ".quiz-studio";

type MigrationFixture = Awaited<ReturnType<typeof createFixture>>;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-migration-"));
  roots.push(root);
  const projectRoot = path.join(root, "project");
  const contentRoot = path.join(root, "content");
  const originals = new Map<string, string>();
  await mkdir(path.join(projectRoot, retiredRuntimeName), { recursive: true });
  await mkdir(path.join(contentRoot, retiredRuntimeName), { recursive: true });
  await writeFile(path.join(projectRoot, retiredRuntimeName, "settings.json"), '{"theme":"dark"}\n', "utf8");
  await writeFile(path.join(contentRoot, retiredRuntimeName, "tasks.json"), "[]\n", "utf8");
  for (const [index, slug] of ["alpha", "beta"].entries()) {
    const channelFile = path.join(contentRoot, "channels", slug, "channel.json");
    const content = `${JSON.stringify({ channel_id: `ch_${index + 1}`, slug, group_id: "quiz", engine: "quiz", language: "French" }, null, 2)}\n`;
    await mkdir(path.dirname(channelFile), { recursive: true });
    await writeFile(channelFile, content, "utf8");
    originals.set(channelFile, content);
  }
  const nestedMetadata = path.join(contentRoot, "channels", "alpha", "episodes", "example", "channel.json");
  const nestedContent = '{"engine":"provider-specific","kind":"episode-fixture"}\n';
  await mkdir(path.dirname(nestedMetadata), { recursive: true });
  await writeFile(nestedMetadata, nestedContent, "utf8");
  return { root, projectRoot, contentRoot, originals, nestedMetadata, nestedContent };
}

async function runMigration(fixture: MigrationFixture, failureCheckpoint?: string) {
  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    script,
    "-ProjectRoot",
    fixture.projectRoot,
    "-ContentRoot",
    fixture.contentRoot,
  ];
  if (failureCheckpoint) args.push("-FailureCheckpoint", failureCheckpoint);
  return execFileAsync("powershell.exe", args, { windowsHide: true });
}

async function assertRolledBack(fixture: MigrationFixture) {
  expect(await pathExists(path.join(fixture.projectRoot, retiredRuntimeName))).toBe(true);
  expect(await pathExists(path.join(fixture.contentRoot, retiredRuntimeName))).toBe(true);
  expect(await pathExists(path.join(fixture.projectRoot, targetRuntimeName))).toBe(false);
  expect(await pathExists(path.join(fixture.contentRoot, targetRuntimeName))).toBe(false);
  for (const [channelFile, original] of fixture.originals) expect(await readFile(channelFile, "utf8")).toBe(original);
  expect(await readFile(fixture.nestedMetadata, "utf8")).toBe(fixture.nestedContent);
  expect(await findFiles(fixture.contentRoot, "channel.json")).toHaveLength(5);
}

describe.runIf(process.platform === "win32")("Quiz-only runtime migration", () => {
  it("migrates channel metadata and both runtime directories with a retained recovery backup", async () => {
    const fixture = await createFixture();
    const result = await runMigration(fixture);

    expect(await pathExists(path.join(fixture.projectRoot, retiredRuntimeName))).toBe(false);
    expect(await pathExists(path.join(fixture.contentRoot, retiredRuntimeName))).toBe(false);
    expect(await readFile(path.join(fixture.projectRoot, targetRuntimeName, "settings.json"), "utf8")).toContain("dark");
    expect(await readFile(path.join(fixture.contentRoot, targetRuntimeName, "tasks.json"), "utf8")).toBe("[]\n");
    for (const channelFile of fixture.originals.keys()) {
      const migrated = JSON.parse(await readFile(channelFile, "utf8")) as Record<string, unknown>;
      expect(migrated).toMatchObject({ language: "French" });
      expect(migrated).not.toHaveProperty("group_id");
      expect(migrated).not.toHaveProperty("engine");
    }
    expect(await readFile(fixture.nestedMetadata, "utf8")).toBe(fixture.nestedContent);
    const backups = await findFiles(path.join(fixture.contentRoot, targetRuntimeName, "migration-backups"), "channel.json");
    expect(backups).toHaveLength(2);
    expect(JSON.parse(await readFile(backups[0], "utf8"))).toHaveProperty("group_id", "quiz");
    expect(result.stdout).toMatch(/total=2 success=2 failed=0 skipped=0 retries=0 elapsed=/i);
  });

  it.each([
    "after-channel-rewrite:1",
    "after-channel-rewrite:2",
    "after-project-runtime-move",
    "after-content-runtime-move",
    "after-backup-move",
  ])("rolls back metadata and runtime moves at checkpoint %s", async (checkpoint) => {
    const fixture = await createFixture();
    const error = await runMigration(fixture, checkpoint).catch((reason: { stdout?: string; stderr?: string }) => reason);

    expect(error).toHaveProperty("code");
    expect(`${error.stdout ?? ""}${error.stderr ?? ""}`).toContain(checkpoint);
    expect(`${error.stdout ?? ""}${error.stderr ?? ""}`).toMatch(/total=2 success=0 failed=1 skipped=0 retries=0 elapsed=/i);
    await assertRolledBack(fixture);
  });

  it.each(["missing-source", "existing-destination"])("aborts before mutation for %s", async (condition) => {
    const fixture = await createFixture();
    if (condition === "missing-source") await rm(path.join(fixture.projectRoot, retiredRuntimeName), { recursive: true });
    else await mkdir(path.join(fixture.projectRoot, targetRuntimeName), { recursive: true });

    const error = await runMigration(fixture).catch((reason: { stdout?: string; stderr?: string }) => reason);
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    expect(error).toHaveProperty("code");
    expect(output).toContain(condition === "missing-source" ? "Missing source runtime" : "Destination already exists");
    expect(output).toMatch(/success=0 failed=1 skipped=0 retries=0 elapsed=/i);
    for (const [channelFile, original] of fixture.originals) expect(await readFile(channelFile, "utf8")).toBe(original);
    expect((await readdir(fixture.contentRoot)).some((entry) => entry.startsWith(".quiz-migration-"))).toBe(false);
  });
});

async function pathExists(candidate: string): Promise<boolean> {
  return readFile(candidate).then(
    () => true,
    async () =>
      readdir(candidate).then(
        () => true,
        () => false,
      ),
  );
}

async function findFiles(root: string, filename: string): Promise<string[]> {
  const matches: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(candidate);
      else if (entry.name === filename) matches.push(candidate);
    }
  };
  await visit(root);
  return matches;
}
