import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const supportsColor = Boolean(process.stderr.isTTY && process.env.NO_COLOR === undefined);
const startedAt = Date.now();
const startedAtIso = new Date(startedAt).toISOString();
const colors = {
  dim: supportsColor ? "\u001b[2m" : "",
  cyan: supportsColor ? "\u001b[36m" : "",
  green: supportsColor ? "\u001b[32m" : "",
  blue: supportsColor ? "\u001b[1;34m" : "",
  red: supportsColor ? "\u001b[1;31m" : "",
  reset: supportsColor ? "\u001b[0m" : "",
};

function log(level, step, message, color) {
  const timestamp = new Date().toISOString();
  process.stderr.write(
    `${colors.dim}${timestamp}${colors.reset} ${color}[${level}]${colors.reset} ${colors.blue}[STEP:${step}]${colors.reset} ${message}\n`,
  );
}

const retiredProductToken = ["docu", "mentary"].join("");
const forbidden = [
  retiredProductToken,
  ["channel", "groupid"].join(""),
  ["channeltype", "historytitle"].join(""),
  ["channeltype", "historybadge"].join(""),
  ["generate_", "narration"].join(""),
].map((value) => value.toLowerCase());

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const failures = [];
const failedFiles = new Set();
let skipped = 0;

log("INFO", "startup", `started_at=${startedAtIso} tracked=${files.length} mode=read-only automation=git-index`, colors.cyan);
log("STEP", "scan", `Checking ${forbidden.length} retired identifiers`, colors.blue);

for (const file of files) {
  const lowerPath = file.toLowerCase();
  for (const token of forbidden) {
    if (lowerPath.includes(token)) {
      failures.push(`${file}: filename contains ${token}`);
      failedFiles.add(file);
    }
  }

  const buffer = readFileSync(file);
  if (buffer.includes(0)) {
    if (!failedFiles.has(file)) skipped += 1;
    continue;
  }
  const content = buffer.toString("utf8").toLowerCase();
  for (const token of forbidden) {
    if (content.includes(token)) {
      failures.push(`${file}: content contains ${token}`);
      failedFiles.add(file);
    }
  }
}

const failed = failedFiles.size;
const success = files.length - failed - skipped;
const elapsed = `${Date.now() - startedAt}ms`;

if (failures.length > 0) {
  for (const failure of failures) log("ERROR", "scan", failure, colors.red);
  log(
    "ERROR",
    "summary",
    `total=${files.length} success=${success} failed=${failed} skipped=${skipped} retries=0 elapsed=${elapsed}`,
    colors.red,
  );
  process.exit(1);
}

log("OK", "summary", `total=${files.length} success=${success} failed=0 skipped=${skipped} retries=0 elapsed=${elapsed}`, colors.green);
