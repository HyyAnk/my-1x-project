import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
import type { RepositoryRuntime } from "./runtime.js";

export async function getGitInfo(this: RepositoryRuntime): Promise<{ branch: string | null; dirty: boolean; changed_files: number }> {
  try {
    const { stdout: branch } = await execFileAsync("git", ["branch", "--show-current"], { cwd: this.rootDirectory });
    const { stdout: status } = await execFileAsync("git", ["status", "--short"], { cwd: this.rootDirectory });
    return { branch: branch.trim() || null, dirty: Boolean(status.trim()), changed_files: status.trim() ? status.trim().split(/\r?\n/).length : 0 };
  } catch {
    return { branch: null, dirty: false, changed_files: 0 };
  }
}
