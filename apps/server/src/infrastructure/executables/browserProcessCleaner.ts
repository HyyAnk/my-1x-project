import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface BrowserCleanerLogger {
  info?: (message: string, context?: Record<string, unknown>) => void;
  warn?: (message: string, context?: Record<string, unknown>) => void;
  error?: (message: string, context?: Record<string, unknown>) => void;
}

export interface CleanBrowsersOptions {
  logger?: BrowserCleanerLogger;
  platform?: NodeJS.Platform;
  execCommand?: (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;
}

const HEADLESS_BROWSER_NAME_PATTERN = /^(chrome|msedge|chromium|chrome-headless-shell)(\.exe)?$/i;
const AUTOMATION_FLAG_PATTERN = /(--headless|chrome-headless-shell)/i;
const PUPPETEER_MARKER_PATTERN = /(remote-debugging|user-data-dir|begin-frame|deterministic-mode|puppeteer)/i;

/**
 * Parses numeric process IDs from command line output.
 */
export function parseProcessIds(output: string): number[] {
  return output
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line))
    .map((line) => Number.parseInt(line, 10))
    .filter((pid) => Number.isFinite(pid) && pid > 0);
}

/**
 * Discovers and terminates orphaned or leftover headless browser instances
 * spawned during automated video rendering, layout checks, or test runs.
 *
 * Guaranteed safe: only targets processes running with explicit `--headless`
 * or `chrome-headless-shell` flags and automation debugging markers. Never
 * targets interactive user browser windows.
 */
export async function cleanOrphanedHeadlessBrowsers(options: CleanBrowsersOptions = {}): Promise<number> {
  const platform = options.platform ?? process.platform;
  const exec = options.execCommand ?? ((cmd, args) => execFileAsync(cmd, args, { windowsHide: true, timeout: 10_000 }));

  if (platform === "win32") {
    return cleanWindowsHeadlessBrowsers(options.logger, exec);
  }

  return cleanUnixHeadlessBrowsers(options.logger, exec);
}

async function cleanWindowsHeadlessBrowsers(
  logger?: BrowserCleanerLogger,
  exec: (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }> = (cmd, args) =>
    execFileAsync(cmd, args, { windowsHide: true, timeout: 10_000 }),
): Promise<number> {
  try {
    const script = `
      Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        ($_.Name -match '^(chrome|msedge|chromium|chrome-headless-shell)\\.exe$') -and
        ($_.CommandLine -match '--headless|chrome-headless-shell') -and
        ($_.CommandLine -match 'remote-debugging|user-data-dir|begin-frame|deterministic-mode|puppeteer')
      } | Select-Object -ExpandProperty ProcessId
    `;

    const { stdout } = await exec("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
    const pids = parseProcessIds(stdout);

    if (pids.length === 0) return 0;

    let killed = 0;
    for (const pid of pids) {
      try {
        await exec("taskkill.exe", ["/PID", String(pid), "/T", "/F"]);
        killed++;
        logger?.info?.(`Cleaned up orphaned headless browser (PID ${pid})`, { step: "browser_cleanup", pid });
      } catch (killError) {
        logger?.warn?.(`Failed to terminate headless browser (PID ${pid}): ${killError instanceof Error ? killError.message : "unknown"}`, {
          step: "browser_cleanup",
          pid,
        });
      }
    }
    return killed;
  } catch (error) {
    logger?.warn?.(`Headless browser sweep failed: ${error instanceof Error ? error.message : "unknown error"}`, {
      step: "browser_cleanup",
    });
    return 0;
  }
}

async function cleanUnixHeadlessBrowsers(
  logger?: BrowserCleanerLogger,
  exec: (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }> = (cmd, args) =>
    execFileAsync(cmd, args, { timeout: 10_000 }),
): Promise<number> {
  try {
    const { stdout } = await exec("ps", ["-eo", "pid,ppid,args"]);
    const lines = stdout.split("\n");
    let killed = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      const pid = Number.parseInt(parts[0], 10);
      const ppid = Number.parseInt(parts[1], 10);
      const args = parts.slice(2).join(" ");

      if (!Number.isFinite(pid) || pid <= 1) continue;

      const isBrowser = HEADLESS_BROWSER_NAME_PATTERN.test(parts[2]?.split("/").pop() ?? "");
      const isHeadless = AUTOMATION_FLAG_PATTERN.test(args);
      const isAutomation = PUPPETEER_MARKER_PATTERN.test(args);

      if (isBrowser && isHeadless && isAutomation && ppid === 1) {
        try {
          await exec("kill", ["-9", String(pid)]);
          killed++;
          logger?.info?.(`Cleaned up orphaned headless browser (PID ${pid})`, { step: "browser_cleanup", pid });
        } catch {
          // Ignore kill errors for already-exited processes
        }
      }
    }
    return killed;
  } catch {
    return 0;
  }
}
