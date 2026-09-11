import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB limit per staged file
const BANNED_PATTERNS = [
  {
    regex: /(^|[/\\])\.quiz-studio[/\\]knowledge_base[/\\]backups[/\\]/,
    reason: "Knowledge base runtime backup files must not be committed to Git.",
  },
  {
    regex: /(^|[/\\])\.quiz-studio[/\\].*?[/\\]backups[/\\]/,
    reason: "Quiz studio runtime backup files must not be committed to Git.",
  },
];

function getStagedFiles(workspaceRoot) {
  try {
    const output = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    return output.split("\0").filter(Boolean);
  } catch (err) {
    console.error("[pre-commit] Failed to inspect staged files:", err.message);
    return [];
  }
}

function main() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(currentDir, "..");
  const stagedFiles = getStagedFiles(workspaceRoot);

  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  const violations = [];

  for (const file of stagedFiles) {
    const normalized = file.replace(/\\/g, "/");

    // 1. Check banned pattern violations
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.regex.test(file) || pattern.regex.test(normalized)) {
        violations.push({
          file,
          reason: pattern.reason,
        });
        break;
      }
    }

    // 2. Check file size limits
    const fullPath = path.resolve(workspaceRoot, file);
    try {
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && stat.size > MAX_FILE_SIZE_BYTES) {
          const mb = (stat.size / (1024 * 1024)).toFixed(2);
          violations.push({
            file,
            reason: `File size (${mb} MB) exceeds maximum allowed threshold of 3 MB. Heavy assets must be managed externally.`,
          });
        }
      }
    } catch {
      // Ignore read errors for inaccessible files
    }
  }

  if (violations.length > 0) {
    console.error("\n=======================================================");
    console.error(" [PRE-COMMIT REPOSITORY HYGIENE GATE - FAILED]");
    console.error("=======================================================\n");
    console.error("The following staged file(s) violate repository policies:\n");

    for (const v of violations) {
      console.error(`  - ${v.file}`);
      console.error(`    -> ${v.reason}`);
    }

    console.error("\nPlease unstage these files before committing:");
    console.error("  git restore --staged <file>\n");
    process.exit(1);
  }

  process.exit(0);
}

main();
