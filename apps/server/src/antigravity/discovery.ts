import { execFile } from "node:child_process";
import { access, constants, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { AppConfig } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { AntigravityUnavailableError, type ActiveSessionInfo, type ResolvedAntigravityTarget } from "./types.js";

const execFileAsync = promisify(execFile);

export function getAntigravityBaseDir(): string {
  return path.join(homedir(), ".gemini", "antigravity");
}

export async function isAccessible(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function canExecute(command: string, cwd: string): Promise<boolean> {
  if (!command) return false;
  try {
    await execFileAsync(command, ["--version"], {
      cwd,
      timeout: 5_000,
      windowsHide: true,
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(command),
    });
    return true;
  } catch {
    return false;
  }
}

export async function resolveAntigravityTarget(config: AppConfig, rootDirectory: string): Promise<ResolvedAntigravityTarget> {
  // 1. If a custom command is explicitly configured (different from default 'agy')
  const configured = config.antigravity.command.trim();
  if (configured && configured !== "agy" && (await canExecute(configured, rootDirectory))) {
    return {
      kind: "cli",
      command: configured,
      argsPrefix: [],
      label: `Custom Antigravity CLI (${configured})`,
      version: "Custom CLI",
    };
  }

  const userHome = homedir();

  // 2. Check Antigravity language_server.exe in LocalAppData / Program Files
  const localAppData = process.env.LOCALAPPDATA ?? path.join(userHome, "AppData", "Local");
  const langServerCandidates = [
    path.join(localAppData, "Programs", "Antigravity", "resources", "bin", "language_server.exe"),
    path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Antigravity", "resources", "bin", "language_server.exe"),
    path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Antigravity", "resources", "bin", "language_server.exe"),
  ];

  for (const candidate of langServerCandidates) {
    if (await isAccessible(candidate)) {
      return {
        kind: "agentapi",
        command: candidate,
        argsPrefix: ["agentapi"],
        label: "Antigravity Language Server (Zero API Key)",
        version: "Active Local Engine",
      };
    }
  }

  // 3. Check local Antigravity agentapi.bat in ~/.gemini/antigravity/bin
  const agentApiBat = path.join(userHome, ".gemini", "antigravity", "bin", "agentapi.bat");
  if (await isAccessible(agentApiBat)) {
    try {
      const batContent = await readFile(agentApiBat, "utf8");
      const match = batContent.match(/"([^"]+language_server(?:\.exe)?)"/i);
      if (match && (await isAccessible(match[1]))) {
        return {
          kind: "agentapi",
          command: match[1],
          argsPrefix: ["agentapi"],
          label: "Antigravity Language Server (Zero API Key)",
          version: "Active Local Engine",
        };
      }
    } catch {
      // Fall back to agentApiBat directly if reading fails
    }

    return {
      kind: "agentapi",
      command: agentApiBat,
      argsPrefix: [],
      label: "Antigravity IDE (Native AgentAPI - Zero API Key)",
      version: "Active IDE Session",
    };
  }

  // 4. Check CLI command (e.g. agy)
  const cliCandidate = configured || "agy";
  if (await canExecute(cliCandidate, rootDirectory)) {
    return {
      kind: "cli",
      command: cliCandidate,
      argsPrefix: [],
      label: "Antigravity CLI (agy)",
      version: "System CLI",
    };
  }

  // 5. Search where.exe on Windows for CLI
  const whereRes = await execFileAsync("where.exe", [cliCandidate], { timeout: 3000, windowsHide: true }).catch(() => null);
  if (whereRes && whereRes.stdout) {
    const candidate = whereRes.stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(Boolean);
    if (candidate && (await canExecute(candidate, rootDirectory))) {
      return {
        kind: "cli",
        command: candidate,
        argsPrefix: [],
        label: "Antigravity CLI (agy)",
        version: "System CLI",
      };
    }
  }

  // 6. If Google Gemini API key configured
  if (config.antigravity.api_key.trim()) {
    return {
      kind: "api",
      command: "Google AI API",
      argsPrefix: [],
      label: "Google AI REST API",
      version: "Gemini API Endpoint",
    };
  }

  throw new AntigravityUnavailableError(
    "Antigravity engine not found. Ensure Antigravity IDE is running or provide a Gemini API Key in Settings.",
  );
}

export async function discoverActiveSession(logger: StudioLogger, forceRefresh = false): Promise<ActiveSessionInfo> {
  let address = !forceRefresh ? (process.env.ANTIGRAVITY_LS_ADDRESS?.trim() || null) : null;
  let csrfToken = !forceRefresh ? (process.env.ANTIGRAVITY_CSRF_TOKEN?.trim() || null) : null;
  let projectId = process.env.ANTIGRAVITY_PROJECT_ID?.trim() || null;

  if (process.platform === "win32" && (forceRefresh || !address || !csrfToken)) {
    try {
      const psScript = `
        $proc = Get-CimInstance Win32_Process -Filter "Name = 'language_server.exe'" | Select-Object -First 1 ProcessId, CommandLine
        if (-not $proc) { exit 1 }
        $csrf = if ($proc.CommandLine -match '--csrf_token\\s+([a-zA-Z0-9\\-]+)') { $matches[1] } else { '' }
        $conns = Get-NetTCPConnection -OwningProcess $proc.ProcessId -State Listen -ErrorAction SilentlyContinue
        $port = ''
        foreach ($conn in $conns) {
          if ($conn.LocalAddress -in @('127.0.0.1', '0.0.0.0', '::1', '::')) {
            $port = $conn.LocalPort
            break
          }
        }
        Write-Output "$port|$csrf"
      `;
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript], {
        windowsHide: true,
        timeout: 4000,
      });

      const line = stdout.trim();
      const [port, discoveredCsrf] = line.split("|");
      if (port) address = `127.0.0.1:${port}`;
      if (discoveredCsrf) csrfToken = discoveredCsrf.trim();
    } catch (err) {
      logger.debug(`Language server session discovery failed: ${err instanceof Error ? err.message : "unknown"}`, {
        step: "antigravity_discovery",
      });
    }
  }

  if (!projectId) {
    try {
      const appStoragePath = path.join(homedir(), "AppData", "Roaming", "Antigravity", "app_storage.json");
      const raw = await readFile(appStoragePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.lastCreatedProjectId === "string") {
        projectId = parsed.lastCreatedProjectId.trim() || null;
      }
      if (!projectId && typeof parsed["new-convo-selected-environments"] === "string") {
        const envs = JSON.parse(parsed["new-convo-selected-environments"]) as Record<string, unknown>;
        projectId = Object.keys(envs)[0] || null;
      }
    } catch {
      // App storage might not exist
    }
  }

  if (address) process.env.ANTIGRAVITY_LS_ADDRESS = address;
  if (csrfToken) process.env.ANTIGRAVITY_CSRF_TOKEN = csrfToken;
  if (projectId) process.env.ANTIGRAVITY_PROJECT_ID = projectId;

  return { address, csrfToken, projectId };
}
