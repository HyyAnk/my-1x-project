import { DEFAULT_ANTIGRAVITY_SUGGESTED_MODEL } from "../antigravity/types.js";

export function resolveIntroOutroScriptModel(configuredModel: string): string {
  const candidate = configuredModel.trim();
  if (candidate && /gemini.*flash/i.test(candidate) && !/image/i.test(candidate)) return candidate;
  return DEFAULT_ANTIGRAVITY_SUGGESTED_MODEL.id;
}
