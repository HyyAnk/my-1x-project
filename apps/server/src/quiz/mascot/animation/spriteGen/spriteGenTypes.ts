import type { AnimationState } from "@studio/shared";

export const REQUIRED_FRAME_COUNT = 12 as const;
export const REQUIRED_FPS = 8 as const;
export const FRAME_DURATION_MS = 125 as const; // 1000ms / 8fps = 125ms
export const PINNED_UPSTREAM_REVISION = "sprite-gen-codex-v1.0.0-pin12f" as const;
export const SUPPORTED_PROVIDER = "codex" as const;

export type SpriteGenPipelineStep = "prepare" | "gen-set" | "extract" | "curation" | "compose-atlas" | "inspect" | "score" | "import";

export const CANONICAL_PIPELINE_STEPS: readonly SpriteGenPipelineStep[] = [
  "prepare",
  "gen-set",
  "extract",
  "curation",
  "compose-atlas",
  "inspect",
  "score",
  "import",
] as const;

export interface SpriteGenLogContext {
  jobId: string;
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slot: number;
  attempt: number;
  step?: SpriteGenPipelineStep;
}

export type SpriteGenLogLevel = "info" | "warn" | "error";

export interface SpriteGenLogEntry {
  timestamp: string;
  level: SpriteGenLogLevel;
  message: string;
  stream: "stdout" | "stderr" | "system";
  context: SpriteGenLogContext;
}

export type SpriteGenProcessErrorCode = "PROCESS_TIMEOUT" | "PROCESS_ABORTED" | "PROCESS_FAILED" | "SPAWN_ERROR";

export class SpriteGenProcessError extends Error {
  public readonly code: SpriteGenProcessErrorCode;
  public readonly exitCode?: number | null;
  public readonly logs: SpriteGenLogEntry[];

  constructor(message: string, code: SpriteGenProcessErrorCode, options?: { exitCode?: number | null; logs?: SpriteGenLogEntry[] }) {
    super(message);
    this.name = "SpriteGenProcessError";
    this.code = code;
    this.exitCode = options?.exitCode ?? null;
    this.logs = options?.logs ?? [];
  }
}

export interface SpriteGenEnvironmentInfo {
  pythonPath: string | null;
  pythonVersion: string | null;
  venvPath: string | null;
  spriteGenCliPath: string | null;
  pinnedRevision: string;
  cliVersion: string | null;
  codexAvailable: boolean;
  ffmpegFreeVerified: boolean;
  isReady: boolean;
  notes: string[];
}

export interface SpriteGenCommandConfig {
  styleAnchorPath: string;
  recipeId: string;
  prompt: string;
  frameCount: number;
  fps: number;
  loop: boolean;
  cellWidth: number;
  cellHeight: number;
  margin: number;
  chromaKey: string;
  fit: "contain" | "cover";
  outputDir: string;
  provider?: string;
}

export interface SpriteGenArtifactPaths {
  requestJsonPath: string;
  rawFramesDir: string;
  curatedFramesDir: string;
  atlasPath: string;
  manifestPath: string;
  qaReportPath: string;
}

export interface SpriteGenCommandShape {
  executable: string;
  args: string[];
  requestJson: Record<string, unknown>;
  artifactPaths: SpriteGenArtifactPaths;
  pipelineSteps: readonly SpriteGenPipelineStep[];
  ffmpegRequired: boolean;
  provider: string;
}

export interface SpriteGenValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SpriteGenDiagnosticReport {
  timestamp: string;
  environment: SpriteGenEnvironmentInfo;
  commandShape: SpriteGenCommandShape;
  validation: SpriteGenValidationResult;
  success: boolean;
}

export interface SpriteGenExecutionRequest {
  jobId: string;
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slot: number;
  recipeId: string;
  prompt: string;
  styleAnchorPath: string;
  outputDir: string;
  loop?: boolean;
  cellWidth?: number;
  cellHeight?: number;
  margin?: number;
  chromaKey?: string;
  fit?: "contain" | "cover";
  timeoutMs?: number;
  signal?: AbortSignal;
  fixtureMode?: boolean;
  sourceFingerprint: string;
  attempt?: number;
  provider?: string;
}

export interface SpriteGenExecutionResult {
  jobId: string;
  success: boolean;
  outputDir: string;
  manifestPath: string;
  atlasPath: string;
  qaReportPath: string;
  logs: SpriteGenLogEntry[];
  durationMs: number;
  error?: string;
}
