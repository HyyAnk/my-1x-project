import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const startedAt = Date.now();
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(workspaceRoot, ".prettier-baseline.json");
const prettierBin = path.join(workspaceRoot, "node_modules", "prettier", "bin", "prettier.cjs");
const updateBaseline = process.argv.includes("--update-baseline");
const patterns = ["{apps,packages}/**/*.{ts,tsx,css,json}", "*.{json,yml,yaml,md,mjs}", ".github/**/*.yml", "scripts/**/*.mjs"];

const supportsColor = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const colors = {
  dim: "\u001B[2m",
  cyan: "\u001B[36m",
  green: "\u001B[32m",
  yellow: "\u001B[33m",
  red: "\u001B[1;31m",
  blue: "\u001B[1;34m",
  reset: "\u001B[0m",
};

function paint(value, color) {
  return supportsColor ? `${colors[color]}${value}${colors.reset}` : value;
}

function log(level, message, { step = "format", color = "cyan" } = {}) {
  const timestamp = new Date().toISOString().slice(11, 19);
  process.stdout.write(
    `${paint(timestamp, "dim")} ${paint(`[${level}]`, color)} ${paint("[T:main]", "dim")} ${paint(`[STEP:${step}]`, "blue")} ${message}\n`,
  );
}

function normalizedPath(filePath) {
  return path.relative(workspaceRoot, path.resolve(workspaceRoot, filePath)).replaceAll("\\", "/");
}

function fileHash(relativePath) {
  return createHash("sha256")
    .update(readFileSync(path.join(workspaceRoot, relativePath)))
    .digest("hex");
}

function readBaseline() {
  if (!existsSync(baselinePath)) return { version: 1, files: {} };
  const parsed = JSON.parse(readFileSync(baselinePath, "utf8"));
  if (parsed?.version !== 1 || typeof parsed.files !== "object" || parsed.files === null) {
    throw new Error("Invalid .prettier-baseline.json. Regenerate it with pnpm format:baseline.");
  }
  return parsed;
}

const baseline = readBaseline();
log(
  "INFO",
  `Starting format verification | mode=${updateBaseline ? "update-baseline" : "check"} | patterns=${patterns.length} | baseline=${Object.keys(baseline.files).length} | concurrency=1 | method=Prettier CLI`,
  { step: "startup" },
);

const result = spawnSync(process.execPath, [prettierBin, "--list-different", ...patterns], {
  cwd: workspaceRoot,
  encoding: "utf8",
  windowsHide: true,
});

if (result.status !== 0 && result.status !== 1) {
  log("ERROR", `Prettier failed to scan the workspace: ${(result.stderr || result.stdout || "unknown error").trim()}`, {
    step: "scan",
    color: "red",
  });
  process.exit(result.status || 2);
}

const unformatted = result.stdout
  .split(/\r?\n/u)
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map(normalizedPath)
  .sort();

if (updateBaseline) {
  const files = Object.fromEntries(unformatted.map((filePath) => [filePath, fileHash(filePath)]));
  writeFileSync(baselinePath, `${JSON.stringify({ version: 1, files }, null, 2)}\n`, "utf8");
  log("OK", `Updated format baseline with ${unformatted.length} existing unformatted files`, { step: "baseline", color: "green" });
  log("DONE", `total=${unformatted.length} success=1 failed=0 skipped=0 retries=0 elapsed=${Date.now() - startedAt}ms`, {
    step: "summary",
    color: "green",
  });
  process.exit(0);
}

const changed = unformatted.filter((filePath) => baseline.files[filePath] !== fileHash(filePath));
const suppressed = unformatted.length - changed.length;
for (const filePath of changed) {
  log("ERROR", `${filePath} is not formatted. Run pnpm exec prettier --write "${filePath}" and retry.`, {
    step: "verify",
    color: "red",
  });
}

if (changed.length > 0) {
  log(
    "FAILED",
    `total=${unformatted.length} success=0 failed=${changed.length} skipped=${suppressed} retries=0 elapsed=${Date.now() - startedAt}ms`,
    { step: "summary", color: "red" },
  );
  process.exit(1);
}

log("OK", `Formatting verified; ${suppressed} unchanged baseline files remain`, { step: "verify", color: "green" });
log("DONE", `total=${unformatted.length} success=1 failed=0 skipped=${suppressed} retries=0 elapsed=${Date.now() - startedAt}ms`, {
  step: "summary",
  color: "green",
});
