import { execFile } from "node:child_process";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { StudioLogger } from "../logger.js";
import { studioRuntimePath } from "../runtimePaths.js";

const execFileAsync = promisify(execFile);

export class CodexUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexUnavailableError";
  }
}

export async function canExecuteCommand(command: string, rootDirectory: string): Promise<boolean> {
  if (!command) return false;
  try {
    await execFileAsync(command, ["--version"], {
      cwd: rootDirectory,
      timeout: 5_000,
      windowsHide: true,
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(command),
    });
    return true;
  } catch {
    return false;
  }
}

export async function locateWindowsCodexCommands(rootDirectory: string): Promise<string[]> {
  const located: string[] = [];
  for (const name of ["codex.exe", "codex"]) {
    const result = await execFileAsync("where.exe", [name], { cwd: rootDirectory, timeout: 5_000, windowsHide: true }).catch(() => null);
    if (!result) continue;
    located.push(
      ...result.stdout
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }
  return [...new Set(located)];
}

export async function resolveCodexCommand(configuredCommand: string, rootDirectory: string, logger: StudioLogger): Promise<string> {
  const configured = configuredCommand.trim() || "codex";
  if (await canExecuteCommand(configured, rootDirectory)) {
    return configured;
  }
  if (process.platform === "win32" && /(^|[\\/])codex(?:\.exe)?$/i.test(configured)) {
    const cacheDirectory = studioRuntimePath(rootDirectory, "codex");
    const cached = path.join(cacheDirectory, "codex.exe");
    const tried: string[] = [configured];

    const located = await locateWindowsCodexCommands(rootDirectory);
    const packageRoot = path.join(process.env.ProgramFiles ?? "C:\\Program Files", "WindowsApps");
    const packageNames = await readdir(packageRoot).catch(() => [] as string[]);
    const packageCandidates = packageNames
      .filter((name) => /^OpenAI\.Codex_/i.test(name))
      .sort()
      .reverse()
      .map((name) => path.join(packageRoot, name, "app", "resources", "codex.exe"));
    const candidates = [...new Set([...located, ...packageCandidates])];

    for (const source of candidates) {
      if (!source || tried.includes(source)) continue;
      tried.push(source);
      const sourceStats = await stat(source).catch(() => null);
      if (!sourceStats) continue;

      if (/\.(cmd|bat)$/i.test(source) && (await canExecuteCommand(source, rootDirectory))) {
        logger.info("Using the Codex command wrapper discovered on PATH", { step: "codex_resolve" });
        return source;
      }

      await mkdir(cacheDirectory, { recursive: true });
      const cachedStats = await stat(cached).catch(() => null);
      if (!cachedStats || sourceStats.mtimeMs > cachedStats.mtimeMs || sourceStats.size !== cachedStats.size) {
        await copyFile(source, cached).catch((error) => {
          logger.debug(`Could not cache Codex candidate ${source}: ${error instanceof Error ? error.message : "copy failed"}`, {
            step: "codex_resolve",
          });
        });
      }
      if (await canExecuteCommand(cached, rootDirectory)) {
        logger.info("Using a local Codex binary copied from the Windows package", { step: "codex_resolve" });
        return cached;
      }
    }

    if (await canExecuteCommand(cached, rootDirectory)) {
      logger.info("Using the cached Codex binary", { step: "codex_resolve" });
      return cached;
    }

    const suffix = tried.length > 1 ? ` (tried ${tried.slice(0, 6).join(", ")}${tried.length > 7 ? ", …" : ""})` : "";
    throw new CodexUnavailableError(`Codex command could not be executed: ${configured}${suffix}`);
  }
  throw new CodexUnavailableError(`Codex command could not be executed: ${configured}`);
}
