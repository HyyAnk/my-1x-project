import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { StudioLogger } from "../logger.js";

const execFileAsync = promisify(execFile);

export type PortResponsivenessCheck = (address: string) => Promise<boolean>;

export interface LanguageServerProbeResult {
  address: string | null;
  csrfToken: string | null;
}

const LANGUAGE_SERVER_PROBE_SCRIPT = `
        $procs = Get-CimInstance Win32_Process -Filter "Name = 'language_server.exe'"
        $proc = $procs | Where-Object { $_.CommandLine -match '--csrf_token' } | Select-Object -First 1 ProcessId, CommandLine
        if (-not $proc) { $proc = $procs | Select-Object -First 1 ProcessId, CommandLine }
        if (-not $proc) { exit 1 }
        $csrf = if ($proc.CommandLine -match '--csrf_token\\s+([a-zA-Z0-9\\-]+)') { $matches[1] } else { '' }
        $conns = Get-NetTCPConnection -OwningProcess $proc.ProcessId -State Listen -ErrorAction SilentlyContinue
        $ports = @()
        foreach ($conn in $conns) {
          if ($conn.LocalAddress -in @('127.0.0.1', '0.0.0.0', '::1', '::')) {
            $ports += $conn.LocalPort
          }
        }
        $portsStr = ($ports | Select-Object -Unique) -join ','
        Write-Output "$portsStr|$csrf"
      `;

async function selectWorkingAddress(
  candidatePorts: string[],
  isPortResponsive: PortResponsivenessCheck,
): Promise<string | null> {
  for (const p of candidatePorts) {
    const candidateAddr = `127.0.0.1:${p}`;
    if (await isPortResponsive(candidateAddr)) {
      return candidateAddr;
    }
  }
  return candidatePorts.length > 0 ? `127.0.0.1:${candidatePorts[0]}` : null;
}

export async function probeWindowsLanguageServer(
  logger: StudioLogger,
  isPortResponsive: PortResponsivenessCheck,
): Promise<LanguageServerProbeResult> {
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", LANGUAGE_SERVER_PROBE_SCRIPT],
      { windowsHide: true, timeout: 8000 },
    );

    const line = stdout.trim();
    const [portsRaw, discoveredCsrf] = line.split("|");
    const candidatePorts = (portsRaw || "").split(",").map((p) => p.trim()).filter(Boolean);
    const address = await selectWorkingAddress(candidatePorts, isPortResponsive);
    return { address, csrfToken: discoveredCsrf ? discoveredCsrf.trim() : null };
  } catch (err) {
    logger.debug(`Language server session discovery failed: ${err instanceof Error ? err.message : "unknown"}`, {
      step: "antigravity_discovery",
    });
    return { address: null, csrfToken: null };
  }
}

export async function readStoredAntigravityProjectId(): Promise<string | null> {
  try {
    const appStoragePath = path.join(homedir(), "AppData", "Roaming", "Antigravity", "app_storage.json");
    const raw = await readFile(appStoragePath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    let projectId: string | null = null;
    if (typeof parsed.lastCreatedProjectId === "string") {
      projectId = parsed.lastCreatedProjectId.trim() || null;
    }
    if (!projectId && typeof parsed["new-convo-selected-environments"] === "string") {
      const envs = JSON.parse(parsed["new-convo-selected-environments"]) as Record<string, unknown>;
      projectId = Object.keys(envs)[0] || null;
    }
    return projectId;
  } catch {
    // App storage might not exist
    return null;
  }
}
