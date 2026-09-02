import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
export const workspaceRoot = path.resolve(testDirectory, "../../..");

export function createTempDbPath(label) {
  const unique = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return path.join(os.tmpdir(), `${label}-${unique}.db`);
}

export function removeSqliteFiles(dbPath) {
  for (const suffix of ["", "-shm", "-wal"]) {
    fs.rmSync(`${dbPath}${suffix}`, { force: true });
  }
}

export function createGitFixture(label = "coordination-git") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));
  fs.mkdirSync(path.join(root, ".agent-orchestrator"), { recursive: true });
  fs.copyFileSync(path.join(workspaceRoot, ".agent-orchestrator", "zones.yml"), path.join(root, ".agent-orchestrator", "zones.yml"));
  fs.mkdirSync(path.join(root, "apps", "web", "src", "components"), { recursive: true });
  fs.writeFileSync(path.join(root, "apps", "web", "src", "components", "Fixture.tsx"), "export const value = 1;\n");
  runGit(root, ["init"]);
  runGit(root, ["config", "user.email", "coordination-test@example.invalid"]);
  runGit(root, ["config", "user.name", "Coordination Test"]);
  runGit(root, ["config", "core.autocrlf", "false"]);
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "fixture"]);
  return root;
}

export function removeGitFixture(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

export function runGit(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim();
}

export function runClaimProcess({ dbPath, claimId, writeZone }) {
  const claimServiceUrl = pathToFileURL(path.join(workspaceRoot, "scripts", "coordination", "claim-service.mjs")).href;
  const source = [
    `import { claimZone } from ${JSON.stringify(claimServiceUrl)};`,
    "try {",
    "  claimZone({",
    "    agent: process.env.CLAIM_ID,",
    "    task: 'concurrent claim test',",
    "    writeZones: [process.env.WRITE_ZONE],",
    "    claimId: process.env.CLAIM_ID,",
    "    workspaceRoot: process.env.WORKSPACE_ROOT,",
    "    customDbPath: process.env.DB_PATH,",
    "  });",
    "  process.stdout.write('accepted');",
    "} catch (error) {",
    "  process.stdout.write(`rejected:${error.message}`);",
    "}",
  ].join("\n");

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "--eval", source], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        CLAIM_ID: claimId,
        WRITE_ZONE: writeZone,
        WORKSPACE_ROOT: workspaceRoot,
        DB_PATH: dbPath,
      },
      windowsHide: true,
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", () => resolve(output.trim()));
  });
}
