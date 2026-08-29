import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { CodexModel } from "@studio/shared";

export const DEFAULT_CODEX_MODELS: CodexModel[] = [
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { id: "gpt-5.5", label: "GPT-5.5" },
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { id: "gpt-5.3-codex", label: "GPT-5.3 Codex" },
  { id: "gpt-5.3-codex-spark", label: "GPT-5.3 Codex Spark" },
];

export async function getLocalCatalogModels(): Promise<CodexModel[]> {
  const codexHome = process.env.CODEX_HOME?.trim() || path.join(homedir(), ".codex");
  const configText = await readFile(path.join(codexHome, "config.toml"), "utf8").catch(() => "");
  const catalogReference = configText.match(/^\s*model_catalog_json\s*=\s*["']([^"']+)["']/m)?.[1];
  if (!catalogReference) return [];

  const catalogPath = path.isAbsolute(catalogReference) ? catalogReference : path.resolve(codexHome, catalogReference);
  try {
    const payload = JSON.parse(await readFile(catalogPath, "utf8")) as { models?: unknown };
    if (!Array.isArray(payload.models)) return [];
    return payload.models.map((model) => normalizeCatalogModel(model)).filter((model): model is CodexModel => Boolean(model));
  } catch {
    return [];
  }
}

export function normalizeCatalogModel(value: unknown): CodexModel | null {
  if (!value || typeof value !== "object") return null;
  const model = value as Record<string, unknown>;
  if (model.visibility === "hide") return null;
  const id = typeof model.slug === "string" ? model.slug.trim() : "";
  if (!id || isNonTextModel(id)) return null;
  const displayName = typeof model.display_name === "string" && model.display_name.trim() ? model.display_name.trim() : undefined;
  return { id, label: modelLabel(id, displayName) };
}

export function normalizeModel(value: unknown): CodexModel | null {
  if (!value || typeof value !== "object") return null;
  const model = value as Record<string, unknown>;
  const id = typeof model.id === "string" ? model.id.trim() : "";
  if (!id || model.visibility === "hide" || isNonTextModel(id)) return null;
  const displayName = [model.name, model.display_name]
    .find((candidate): candidate is string => typeof candidate === "string" && Boolean(candidate.trim()))
    ?.trim();
  return { id, label: modelLabel(id, displayName) };
}

export function isNonTextModel(id: string): boolean {
  return /(^|[-_])(audio|embedding|image|moderation|realtime|transcri(?:be|ption)?|tts|whisper)([-_]|$)/i.test(id);
}

export function modelLabel(id: string, fallback?: string): string {
  const labels: Record<string, string> = {
    "gpt-5.6-sol": "GPT-5.6 Sol",
    "gpt-5.6-terra": "GPT-5.6 Terra",
    "gpt-5.6-luna": "GPT-5.6 Luna",
    "gpt-5.5": "GPT-5.5",
    "gpt-5.4": "GPT-5.4",
    "gpt-5.4-mini": "GPT-5.4 Mini",
    "gpt-5.3-codex": "GPT-5.3 Codex",
    "gpt-5.3-codex-spark": "GPT-5.3 Codex Spark",
  };
  return labels[id.toLowerCase()] ?? fallback ?? id;
}

export function withCurrentModel(models: CodexModel[], currentModel?: string): CodexModel[] {
  if (!currentModel || models.some((model) => model.id === currentModel)) return models;
  return [{ id: currentModel, label: currentModel }, ...models];
}

export function extractOpenAiOutput(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = payload.output;
  if (Array.isArray(output)) {
    const text = output.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) return [];
      return content.flatMap((part) => {
        if (!part || typeof part !== "object") return [];
        const value = (part as { text?: unknown }).text;
        return typeof value === "string" ? [value] : [];
      });
    });
    if (text.length) return text.join("");
    if (JSON.stringify(output).match(/(?:b64_json|base64|data:image|\.png)/i)) return JSON.stringify(output);
  }
  const choices = payload.choices;
  if (Array.isArray(choices)) {
    const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content;
    if (typeof content === "string") return content;
  }
  throw new Error("Cockpit API returned no text output");
}
