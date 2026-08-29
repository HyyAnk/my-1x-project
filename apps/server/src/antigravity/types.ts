import type { AntigravityModel } from "@studio/shared";

export const DEFAULT_ANTIGRAVITY_SUGGESTED_MODEL: AntigravityModel = {
  id: "gemini-3.7-flash-high",
  label: "Gemini 3.7 Flash (High)",
};

export const DEFAULT_ANTIGRAVITY_MODELS: AntigravityModel[] = [
  { id: "gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image" },
  { id: "gemini-3.7-flash-high", label: "Gemini 3.7 Flash (High)" },
  { id: "gemini-3.7-flash-medium", label: "Gemini 3.7 Flash (Medium)" },
  { id: "gemini-3.7-flash-low", label: "Gemini 3.7 Flash (Low)" },
  { id: "gemini-3.6-flash-high", label: "Gemini 3.6 Flash (High)" },
  { id: "gemini-3.6-flash-medium", label: "Gemini 3.6 Flash (Medium)" },
  { id: "gemini-3.6-flash-low", label: "Gemini 3.6 Flash (Low)" },
  { id: "gemini-3-flash-agent", label: "Gemini 3.5 Flash (High)" },
  { id: "gemini-3.5-flash-low", label: "Gemini 3.5 Flash (Medium)" },
  { id: "gemini-3.5-flash-extra-low", label: "Gemini 3.5 Flash (Low)" },
  { id: "gemini-pro-agent", label: "Gemini 3.1 Pro (High)" },
  { id: "gemini-3.1-pro-low", label: "Gemini 3.1 Pro (Low)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Thinking)" },
  { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 (Thinking)" },
  { id: "gpt-oss-120b-medium", label: "GPT-OSS 120B (Medium)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
];

export class AntigravityUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AntigravityUnavailableError";
  }
}

export type ResolvedAntigravityTarget =
  | { kind: "agentapi"; command: string; argsPrefix: string[]; label: string; version: string }
  | { kind: "cli"; command: string; argsPrefix: string[]; label: string; version: string }
  | { kind: "api"; command: string; argsPrefix: string[]; label: string; version: string };

export type TranscriptToolCall = {
  name?: string;
  args?: { CodeContent?: string; ReplacementContent?: string };
};

export type TranscriptStep = {
  source?: string;
  type?: string;
  status?: string;
  content?: string;
  is_truncated?: boolean;
  tool_calls?: TranscriptToolCall[];
};

export type ActiveSessionInfo = {
  address: string | null;
  csrfToken: string | null;
  projectId: string | null;
};

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
