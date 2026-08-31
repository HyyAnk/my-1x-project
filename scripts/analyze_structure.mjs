import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targetDirs = ["apps/server/src", "apps/web/src", "packages/shared/src", "services/tts"];
const ignoreDirs = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".codegraph",
  ".documentary-studio",
  ".turbo",
  ".cache",
  ".context",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
]);
const allowedExts = new Set([".ts", ".tsx", ".js", ".jsx", ".py"]);
const startedAt = performance.now();
const results = [];
const stats = { scanned: 0, failed: 0, skipped: 0 };

const ansi = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  info: "\u001b[36m",
  success: "\u001b[32m",
  warning: "\u001b[33m",
  error: "\u001b[1;31m",
  step: "\u001b[1;34m",
};

function styled(value, color) {
  return process.stdout.isTTY && !process.env.NO_COLOR ? `${color}${value}${ansi.reset}` : value;
}

function log(level, message, step) {
  const colors = { INFO: ansi.info, OK: ansi.success, WARN: ansi.warning, ERROR: ansi.error, STEP: ansi.step };
  const timestamp = styled(new Date().toISOString(), ansi.dim);
  const label = styled(`[${level}]`, colors[level] ?? ansi.info);
  process.stdout.write(`${timestamp} ${label} [T:main] [STEP:${step}] ${message}\n`);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isSourceFile(name) {
  const extension = path.extname(name);
  return allowedExts.has(extension) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx") && !name.endsWith(".spec.ts");
}

function analyzeFile(fullPath) {
  stats.scanned += 1;
  try {
    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split("\n").length;
    const functionMatches =
      content.match(
        /function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|async\s+function|^\s*(?:public\s+|private\s+|protected\s+|async\s+)*\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/gm,
      ) ?? [];
    const importMatches = content.match(/^import\s+.*from/gm) ?? [];

    results.push({
      relPath: path.relative(root, fullPath).replace(/\\/g, "/"),
      lines,
      sizeKb: (Buffer.byteLength(content) / 1024).toFixed(1),
      functionsCount: functionMatches.length,
      importsCount: importMatches.length,
    });
  } catch (error) {
    stats.failed += 1;
    log("ERROR", `Failed to read ${fullPath}: ${errorMessage(error)} | next=check file permissions`, "read_file");
  }
}

function scan(directory) {
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    stats.skipped += 1;
    log("WARN", `Skipping ${directory}: ${errorMessage(error)} | next=verify target directory`, "scan_directory");
    return;
  }

  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(fullPath);
    else if (entry.isFile() && isSourceFile(entry.name)) analyzeFile(fullPath);
  }
}

log(
  "INFO",
  `Starting source structure analysis | mode=read-only | targets=${targetDirs.length} | concurrency=1 | automation=filesystem-only`,
  "startup",
);
for (const targetDir of targetDirs) {
  log("STEP", `Scanning ${targetDir}`, "scan_target");
  scan(path.join(root, targetDir));
}

const largeFiles = results.filter((result) => result.lines >= 200).sort((a, b) => b.lines - a.lines);
log("INFO", `Source files at or above 200 lines | count=${largeFiles.length}`, "results");
for (const file of largeFiles) {
  log(
    "INFO",
    `[${file.lines.toString().padStart(4)} lines | ${file.sizeKb.padStart(5)} KB | ${file.functionsCount.toString().padStart(2)} funcs | ${file.importsCount.toString().padStart(2)} imports] ${file.relPath}`,
    "result_item",
  );
}

const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(2);
log(
  stats.failed > 0 ? "ERROR" : "OK",
  `Final summary | total=${stats.scanned} | success=${stats.scanned - stats.failed} | failed=${stats.failed} | skipped=${stats.skipped} | retries=0 | large_files=${largeFiles.length} | elapsed=${elapsedSeconds}s`,
  "summary",
);
if (stats.failed > 0) process.exitCode = 1;
