import type { AppConfig } from "@studio/shared";
import type { StudioLogger } from "../../../../logger.js";

export interface MascotVisionAiConfig {
  enabled?: boolean;
  provider?: "google" | "openai" | "custom" | "auto";
  apiKey?: string;
  apiBaseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export interface MascotVisionAnalyzerOptions {
  aiConfig?: MascotVisionAiConfig;
  logger?: StudioLogger;
  mimeType?: string;
  name?: string;
}

function resolveGoogleVisionConfig(config?: AppConfig): MascotVisionAiConfig | null {
  const apiKey =
    config?.antigravity?.api_key?.trim() ||
    process.env.ANTIGRAVITY_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    "";
  if (!apiKey) return null;

  return {
    enabled: true,
    provider: "google",
    apiKey,
    apiBaseUrl: config?.antigravity?.api_base_url?.trim() || "https://generativelanguage.googleapis.com/v1beta",
    model: config?.antigravity?.model?.trim() || "gemini-2.5-flash",
    timeoutMs: 12000,
  };
}

function resolveOpenAiVisionConfig(config?: AppConfig): MascotVisionAiConfig | null {
  const apiKey = config?.codex?.api_key?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
  if (!apiKey) return null;

  return {
    enabled: true,
    provider: "openai",
    apiKey,
    apiBaseUrl: config?.codex?.api_base_url?.trim() || "https://api.openai.com/v1",
    model: config?.codex?.model?.trim() || "gpt-4o-mini",
    timeoutMs: 12000,
  };
}

/**
 * Resolves vision AI analyzer configuration from application settings and environment.
 */
export function resolveMascotVisionAiConfig(config?: AppConfig): MascotVisionAiConfig {
  const googleConfig = resolveGoogleVisionConfig(config);
  if (googleConfig) return googleConfig;

  const openAiConfig = resolveOpenAiVisionConfig(config);
  if (openAiConfig) return openAiConfig;

  return {
    enabled: false,
  };
}
