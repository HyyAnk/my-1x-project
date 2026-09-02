import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AntigravityModel, AppConfig } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { DEFAULT_ANTIGRAVITY_MODELS, describeError, type ActiveSessionInfo, type ResolvedAntigravityTarget } from "./types.js";

const execFileAsync = promisify(execFile);

export function isNonTextModel(id: string): boolean {
  return /(^|[-_])(embedding|imagen|image|audio|tts|whisper)([-_]|$)/i.test(id);
}

export function formatModelLabel(id: string): string {
  const cleanId = id.replace(/^models\//, "");
  if (cleanId === "pro") return "Antigravity Pro (Auto)";
  if (cleanId === "flash") return "Antigravity Flash (Auto)";
  if (cleanId === "flash_lite") return "Antigravity Flash Lite (Auto)";
  return cleanId
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeModel(value: unknown): AntigravityModel | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  const rawId =
    typeof m.id === "string" ? m.id.trim() : typeof m.name === "string" ? m.name.trim() : typeof m.slug === "string" ? m.slug.trim() : "";
  if (!rawId || isNonTextModel(rawId)) return null;
  const id = rawId.replace(/^models\//, "");
  const label =
    typeof m.label === "string" ? m.label.trim() : typeof m.displayName === "string" ? m.displayName.trim() : formatModelLabel(id);
  return { id, label };
}

export function parseModelListOutput(stdout: string): AntigravityModel[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const rawList = Array.isArray(parsed) ? parsed : ((parsed as { models?: unknown[] }).models ?? []);
    return rawList.map((item) => normalizeModel(item)).filter((model): model is AntigravityModel => Boolean(model));
  } catch {
    const lines = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const models: AntigravityModel[] = [];
    for (const line of lines) {
      if (/^(available|models|list):?$/i.test(line)) continue;
      const cleaned = line.replace(/^[-*•]\s*/, "").trim();
      if (!cleaned) continue;
      const match = cleaned.match(/^([a-zA-Z0-9_\-\.]+)(?:\s*\((.*)\))?$/);
      if (match) {
        const id = match[1];
        const extra = match[2] ? ` (${match[2]})` : "";
        models.push({ id, label: `${formatModelLabel(id)}${extra}` });
      }
    }
    return models;
  }
}

export function parseAgentApiModels(payload: {
  response?: {
    models?: Record<string, { displayName?: string; model?: string }>;
    agentModelSorts?: Array<{ groups?: Array<{ modelIds?: string[] }> }>;
  };
}): AntigravityModel[] | null {
  const modelsDict = payload.response?.models ?? {};
  const sortIds = payload.response?.agentModelSorts?.[0]?.groups?.[0]?.modelIds ?? [];
  const models: AntigravityModel[] = [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();

  for (const id of sortIds) {
    const item = modelsDict[id];
    if (!item || seenIds.has(id)) continue;
    const label = item.displayName || formatModelLabel(id);
    seenIds.add(id);
    seenLabels.add(label);
    models.push({ id, label });
  }

  for (const [id, item] of Object.entries(modelsDict)) {
    if (seenIds.has(id) || !item.displayName || id.startsWith("chat_") || id.startsWith("tab_")) continue;
    if (isNonTextModel(id) || seenLabels.has(item.displayName)) continue;
    seenIds.add(id);
    seenLabels.add(item.displayName);
    models.push({ id, label: item.displayName });
  }
  return models.length > 0 ? models : null;
}

export async function getAgentApiModels(session: ActiveSessionInfo, logger: StudioLogger): Promise<AntigravityModel[] | null> {
  if (!session.address || !session.csrfToken) return null;

  const rawPort = session.address.replace(/^localhost:/, "").replace(/^127\.0\.0\.1:/, "");
  const basePort = parseInt(rawPort, 10);
  const portsToTry = !isNaN(basePort) ? [basePort, basePort + 1] : [rawPort];

  for (const p of portsToTry) {
    try {
      const response = await fetch(`http://127.0.0.1:${p}/exa.language_server_pb.LanguageServerService/GetAvailableModels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-codeium-csrf-token": session.csrfToken },
        body: JSON.stringify({ metadata: { ideName: "antigravity", ideVersion: "2.9.1", extensionVersion: "2.9.1" } }),
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as {
        response?: {
          models?: Record<string, { displayName?: string; model?: string }>;
          agentModelSorts?: Array<{ groups?: Array<{ modelIds?: string[] }> }>;
        };
      };
      const parsed = parseAgentApiModels(payload);
      if (parsed) return parsed;
    } catch {
      // Try next port candidate
    }
  }

  return null;
}

export async function getGoogleApiModels(config: AppConfig, logger: StudioLogger): Promise<AntigravityModel[] | null> {
  if (!config.antigravity.api_key.trim()) return null;
  try {
    const base = (config.antigravity.api_base_url.trim() || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
    const apiKey = config.antigravity.api_key.trim();
    const url = `${base}/models?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      models?: Array<{ name?: string; displayName?: string; supportedGenerationMethods?: string[] }>;
    };
    const models = (payload.models ?? [])
      .filter((model) => !model.supportedGenerationMethods || model.supportedGenerationMethods.includes("generateContent"))
      .map((model) => {
        const id = (model.name ?? "").replace(/^models\//, "").trim();
        return { id, label: (model.displayName ?? "").trim() || id };
      })
      .filter((model) => model.id && !isNonTextModel(model.id));
    return models.length > 0 ? models : null;
  } catch (error) {
    logger.debug(`Google AI API model query failed: ${describeError(error)}`, { step: "antigravity_models" });
    return null;
  }
}

export async function getCliModels(
  target: ResolvedAntigravityTarget | null,
  rootDirectory: string,
  logger: StudioLogger,
): Promise<AntigravityModel[] | null> {
  if (!target || target.kind !== "cli") return null;
  try {
    const options = {
      cwd: rootDirectory,
      timeout: 10_000,
      windowsHide: true,
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(target.command),
    };
    const result = await execFileAsync(target.command, ["models", "--json"], options).catch(async () => {
      return execFileAsync(target.command, ["model", "list", "--json"], options);
    });
    const stdout = `${result.stdout}`.trim();
    if (!stdout) return null;
    const models = parseModelListOutput(stdout);
    return models.length > 0 ? models : null;
  } catch (error) {
    logger.warn(`Antigravity dynamic model listing failed: ${describeError(error)}`, { step: "antigravity_models" });
    return null;
  }
}

export function withCurrentModel(models: AntigravityModel[], current: string): AntigravityModel[] {
  if (!current || models.some((m) => m.id === current)) return models;
  const label =
    current === "pro"
      ? "Antigravity Pro (Auto)"
      : current === "flash"
        ? "Antigravity Flash (Auto)"
        : current === "flash_lite"
          ? "Antigravity Flash Lite (Auto)"
          : formatModelLabel(current);
  return [{ id: current, label }, ...models];
}
