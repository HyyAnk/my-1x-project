import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const supportsColor = Boolean(process.stderr.isTTY && process.env.NO_COLOR === undefined);
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

log("INFO", "startup", `Tracked files=${files.length} mode=read-only automation=git-index`, colors.cyan);
log("STEP", "scan", `Checking ${forbidden.length} retired identifiers`, colors.blue);

for (const file of files) {
  const lowerPath = file.toLowerCase();
  for (const token of forbidden) {
    if (lowerPath.includes(token)) failures.push(`${file}: filename contains ${token}`);
  }

  const buffer = readFileSync(file);
  if (buffer.includes(0)) continue;
  const content = buffer.toString("utf8").toLowerCase();
  for (const token of forbidden) {
    if (content.includes(token)) failures.push(`${file}: content contains ${token}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) log("ERROR", "scan", failure, colors.red);
  log("ERROR", "summary", `Total=${files.length} success=0 failed=${failures.length} skipped=0`, colors.red);
  process.exit(1);
}

log("OK", "summary", `Quiz-only source audit passed total=${files.length} failed=0 skipped=0`, colors.green);
