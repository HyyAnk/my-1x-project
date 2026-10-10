import { accessSync, constants, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export interface BrowserDiscoveryOptions {
  configuredPath?: string;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homeDirectory?: string;
  isExecutable?: (candidate: string) => boolean;
}

function environmentValue(env: NodeJS.ProcessEnv, name: string, platform: NodeJS.Platform): string {
  const key = platform === "win32" ? Object.keys(env).find((key) => key.toLowerCase() === name.toLowerCase()) : name;
  return (key ? env[key] : undefined)?.trim() ?? "";
}

function installedCandidates(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, home: string): string[] {
  if (platform === "win32") {
    const roots = ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"]
      .map((name) => environmentValue(env, name, platform))
      .filter(Boolean);
    return roots.flatMap((root) => [
      path.win32.join(root, "Google", "Chrome", "Application", "chrome.exe"),
      path.win32.join(root, "Microsoft", "Edge", "Application", "msedge.exe"),
    ]);
  }
  if (platform === "darwin") {
    return ["/Applications", path.posix.join(home, "Applications")].flatMap((root) => [
      path.posix.join(root, "Google Chrome.app/Contents/MacOS/Google Chrome"),
      path.posix.join(root, "Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
      path.posix.join(root, "Chromium.app/Contents/MacOS/Chromium"),
    ]);
  }
  return ["/usr/bin", "/usr/local/bin", "/snap/bin"].flatMap((root) => browserNames(platform).map((name) => path.posix.join(root, name)));
}

function browserNames(platform: NodeJS.Platform): string[] {
  return platform === "win32"
    ? ["chrome.exe", "msedge.exe", "chromium.exe"]
    : ["google-chrome", "google-chrome-stable", "chromium-browser", "chromium", "microsoft-edge"];
}

function executableFile(candidate: string, platform: NodeJS.Platform): boolean {
  try {
    if (!statSync(candidate).isFile()) return false;
    accessSync(candidate, platform === "win32" ? constants.R_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the user's explicit HYPERFRAMES_BROWSER_PATH when it points at a real executable.
 * Renders otherwise use HyperFrames' managed chrome-headless-shell: on Windows the desktop
 * chrome.exe ignores `--version` during render preflight and opens a visible browser window,
 * and it captured frames ~45% slower than the headless shell in local benchmarks.
 */
export function resolveBrowserOverridePath(options: Pick<BrowserDiscoveryOptions, "platform" | "env" | "isExecutable"> = {}): string | undefined {
  const platform = options.platform ?? process.platform;
  const override = environmentValue(options.env ?? process.env, "HYPERFRAMES_BROWSER_PATH", platform);
  const isExecutable = options.isExecutable ?? ((candidate: string) => executableFile(candidate, platform));
  return override && isExecutable(override) ? override : undefined;
}

/** Shared by production and diagnostics; never launches a browser or invokes a shell. */
export function resolveHardwareBrowserPath(options: BrowserDiscoveryOptions = {}): string | undefined {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const paths = platform === "win32" ? path.win32 : path.posix;
  const isExecutable = options.isExecutable ?? ((candidate: string) => executableFile(candidate, platform));
  const directories = environmentValue(env, "PATH", platform)
    .split(paths.delimiter)
    .map((entry) => entry.trim().replace(/^"(.*)"$/, "$1"))
    .filter((entry) => paths.isAbsolute(entry));
  const candidates = [
    options.configuredPath,
    environmentValue(env, "HYPERFRAMES_BROWSER_PATH", platform),
    ...directories.flatMap((directory) => browserNames(platform).map((name) => paths.join(directory, name))),
    ...installedCandidates(platform, env, options.homeDirectory ?? homedir()),
  ];
  return [...new Set(candidates.map((candidate) => candidate?.trim()).filter((candidate): candidate is string => Boolean(candidate)))].find(
    isExecutable,
  );
}
