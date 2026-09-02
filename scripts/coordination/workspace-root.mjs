import fs from "node:fs";
import path from "node:path";

export function findWorkspaceRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (current) {
    if (fs.existsSync(path.join(current, ".agent-orchestrator", "zones.yml"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}
