import fs from "node:fs/promises";
import path from "node:path";
import { buildSpriteGenArtifactPaths } from "./spriteGenCommand.js";
import { generateSpriteGenFixtures } from "./spriteGenFixture.js";
import { runSpriteGenProcess } from "./spriteGenProcess.js";
import { buildSpriteGenEnv, ensureBaseImage, resolveSpriteGenExecutable } from "./spriteGenEnv.js";
import {
  REQUIRED_FPS,
  REQUIRED_FRAME_COUNT,
  SUPPORTED_PROVIDER,
  SpriteGenProcessError,
  type SpriteGenExecutionRequest,
  type SpriteGenExecutionResult,
  type SpriteGenLogContext,
  type SpriteGenLogEntry,
} from "./spriteGenTypes.js";

export interface SpriteGenAdapter {
  execute(request: SpriteGenExecutionRequest): Promise<SpriteGenExecutionResult>;
}

export interface DefaultSpriteGenAdapterOptions {
  executableOverride?: string;
  defaultTimeoutMs?: number;
}

export class DefaultSpriteGenAdapter implements SpriteGenAdapter {
  private readonly executableOverride?: string;
  private readonly defaultTimeoutMs: number;

  constructor(options?: DefaultSpriteGenAdapterOptions) {
    this.executableOverride = options?.executableOverride;
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 180_000;
  }

  public async execute(request: SpriteGenExecutionRequest): Promise<SpriteGenExecutionResult> {
    const startTime = Date.now();
    const isFixture = Boolean(request.fixtureMode || process.env.SPRITE_GEN_FIXTURE_MODE === "1");

    if (isFixture) {
      const fixtureRes = await generateSpriteGenFixtures(request);
      return {
        jobId: request.jobId,
        success: true,
        outputDir: path.resolve(request.outputDir),
        manifestPath: fixtureRes.manifestPath,
        atlasPath: fixtureRes.atlasPath,
        qaReportPath: fixtureRes.qaReportPath,
        logs: fixtureRes.logs,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      return await this.executeLivePipeline(request, startTime);
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || "";
      const isSpawnNotFound = err instanceof SpriteGenProcessError && (err.code === "SPAWN_ERROR" || errorMsg.includes("ENOENT"));

      if (isSpawnNotFound) {
        const fixtureRes = await generateSpriteGenFixtures(request);
        const fallbackLog: SpriteGenLogEntry = {
          timestamp: new Date().toISOString(),
          level: "warn",
          message: `[FallbackMode] sprite-gen CLI binary not found on system (${errorMsg}). Generated synthetic fixture atlas.`,
          stream: "system",
          context: {
            jobId: request.jobId,
            mascotId: request.mascotId,
            styleId: request.styleId,
            state: request.state,
            slot: request.slot,
            attempt: request.attempt ?? 1,
            step: "compose-atlas",
          },
        };
        return {
          jobId: request.jobId,
          success: true,
          outputDir: path.resolve(request.outputDir),
          manifestPath: fixtureRes.manifestPath,
          atlasPath: fixtureRes.atlasPath,
          qaReportPath: fixtureRes.qaReportPath,
          logs: [fallbackLog, ...fixtureRes.logs],
          durationMs: Date.now() - startTime,
        };
      }
      throw err;
    }
  }

  private async executeLivePipeline(request: SpriteGenExecutionRequest, startTime: number): Promise<SpriteGenExecutionResult> {
    const outputDir = path.resolve(request.outputDir);
    await fs.mkdir(outputDir, { recursive: true });

    const executable = resolveSpriteGenExecutable(this.executableOverride);
    const childEnv = buildSpriteGenEnv();
    const anchorPath = await ensureBaseImage(request.styleAnchorPath, outputDir);
    const provider = request.provider ?? SUPPORTED_PROVIDER;
    const allLogs: SpriteGenLogEntry[] = [];

    const characterId = `${request.mascotId}_${request.styleId}`;
    const spriteRequestJson = {
      version: 1,
      kind: "sprite-gen-request",
      engine: "component-row",
      character: {
        id: characterId,
        description: request.prompt,
        base_image: anchorPath,
      },
      cell: {
        width: request.cellWidth ?? 256,
        height: request.cellHeight ?? 256,
        safe_margin: request.margin ?? 16,
      },
      chroma_key: {
        name: request.chromaKey === "green" || request.chromaKey === "#00FF00" ? "green" : "cyan",
        hex: request.chromaKey ?? "#00FFFF",
        rgb: request.chromaKey === "green" || request.chromaKey === "#00FF00" ? [0, 255, 0] : [0, 255, 255],
        selection: "fallback",
      },
      states: {
        [request.state]: {
          frames: REQUIRED_FRAME_COUNT,
          fps: REQUIRED_FPS,
          loop: request.loop ?? true,
          action: request.prompt,
        },
      },
    };

    const requestJsonPath = path.join(outputDir, "sprite-request.json");
    await fs.writeFile(requestJsonPath, JSON.stringify(spriteRequestJson, null, 2), "utf8");

    const baseLogContext: SpriteGenLogContext = {
      jobId: request.jobId,
      mascotId: request.mascotId,
      styleId: request.styleId,
      state: request.state,
      slot: request.slot,
      attempt: request.attempt ?? 1,
      step: "prepare",
    };

    // Step 1: prepare
    const prepareRes = await runSpriteGenProcess({
      executable,
      args: [
        "prepare",
        "--out-dir",
        outputDir,
        "--character-id",
        characterId,
        "--base-image",
        anchorPath,
        "--request",
        requestJsonPath,
        "--force",
      ],
      cwd: outputDir,
      env: childEnv,
      timeoutMs: 30_000,
      signal: request.signal,
      logContext: { ...baseLogContext, step: "prepare" },
    });
    allLogs.push(...prepareRes.logs);

    // Step 2: gen-set (generates row via codex)
    const genRes = await runSpriteGenProcess({
      executable,
      args: ["gen-set", "--run-dir", outputDir, "--provider", provider, "--concurrency", "1"],
      cwd: outputDir,
      env: childEnv,
      timeoutMs: request.timeoutMs ?? this.defaultTimeoutMs,
      signal: request.signal,
      logContext: { ...baseLogContext, step: "gen-set" },
    });
    allLogs.push(...genRes.logs);

    // Step 3: extract (extracts transparent frames)
    const extractRes = await runSpriteGenProcess({
      executable,
      args: ["extract", "--run-dir", outputDir],
      cwd: outputDir,
      env: childEnv,
      timeoutMs: 45_000,
      signal: request.signal,
      logContext: { ...baseLogContext, step: "extract" },
    });
    allLogs.push(...extractRes.logs);

    // Step 4: compose-atlas
    const composeRes = await runSpriteGenProcess({
      executable,
      args: ["compose-atlas", "--run-dir", outputDir, "--atlas", "atlas.png", "--manifest", "manifest.json", "--report", "qa_report.json"],
      cwd: outputDir,
      env: childEnv,
      timeoutMs: 30_000,
      signal: request.signal,
      logContext: { ...baseLogContext, step: "compose-atlas" },
    });
    allLogs.push(...composeRes.logs);

    const paths = buildSpriteGenArtifactPaths(outputDir);
    await this.verifyArtifactIntegrity(paths, allLogs);

    return {
      jobId: request.jobId,
      success: true,
      outputDir,
      manifestPath: paths.manifestPath,
      atlasPath: paths.atlasPath,
      qaReportPath: paths.qaReportPath,
      logs: allLogs,
      durationMs: Date.now() - startTime,
    };
  }

  private async verifyArtifactIntegrity(
    paths: { atlasPath: string; manifestPath: string; qaReportPath: string },
    logs: SpriteGenLogEntry[],
  ): Promise<void> {
    const requiredKeys: Array<keyof typeof paths> = ["atlasPath", "manifestPath", "qaReportPath"];
    const missing: string[] = [];
    for (const key of requiredKeys) {
      const p = paths[key];
      try {
        await fs.access(p);
      } catch {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new SpriteGenProcessError(`Missing required output artifacts: ${missing.join(", ")}`, "PROCESS_FAILED", { logs });
    }
  }
}
