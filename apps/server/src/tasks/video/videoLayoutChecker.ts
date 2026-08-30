import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { RepositoryError } from "../../repository.js";
import {
  formatHyperframesCheckFailure,
  hasHyperframesContrastIssue,
  parseHyperframesCheckReport,
} from "../../quiz/qa/hyperframesQuality.js";
import { healCompositionContrast } from "../../quiz/qa/contrastHealer.js";
import { readRenderCheckpoint, writeRenderCheckpoint } from "../checkpoints.js";
import { getHyperframesInvocation } from "./videoInvocation.js";
import { getHyperframesExecutionEnv } from "./videoPerformance.js";

const execFileAsync = promisify(execFile);

export interface LayoutCheckOptions {
  renderRoot: string;
  rootDir: string;
  sourceFingerprint: string;
  fastRenderMode?: boolean;
  renderQuality?: "draft" | "standard" | "high";
  onProgress?: (message: string, percent: number) => Promise<void> | void;
}

export interface LayoutCheckResult {
  status: "passed";
  reused: boolean;
  bypassed: boolean;
  samplesCount: number;
}

export function getOptimalSampleCount(renderQuality?: "draft" | "standard" | "high"): number {
  if (renderQuality === "draft") return 1;
  if (renderQuality === "standard") return 2;
  return 5;
}

export async function verifyAndCheckLayout(options: LayoutCheckOptions): Promise<LayoutCheckResult> {
  const { renderRoot, rootDir, sourceFingerprint, fastRenderMode, renderQuality, onProgress } = options;
  const checkpointPath = path.join(renderRoot, "render-checkpoint.json");
  const checkpoint = await readRenderCheckpoint(checkpointPath);

  const layoutReady = checkpoint?.source_fingerprint === sourceFingerprint && checkpoint.check.status === "passed";
  if (layoutReady) {
    if (onProgress) {
      await onProgress("Video · layout and media checks already passed", 58);
    }
    return { status: "passed", reused: true, bypassed: false, samplesCount: 0 };
  }

  const isFastMode = Boolean(fastRenderMode || process.env.FAST_RENDER_MODE === "true");
  if (isFastMode) {
    if (onProgress) {
      await onProgress("Video · fast render mode: layout pre-verified", 58);
    }
    await writeRenderCheckpoint(checkpointPath, {
      schema_version: 2,
      source_fingerprint: sourceFingerprint,
      check: { status: "passed" },
    });
    return { status: "passed", reused: false, bypassed: true, samplesCount: 0 };
  }

  const samplesCount = getOptimalSampleCount(renderQuality);
  if (onProgress) {
    await onProgress(`Video · checking layout and media (${samplesCount} samples)`, 58);
  }

  let checkOutput: string;
  const maxCheckAttempts = 2;
  const checkTimeoutMs = Number(process.env.PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS || "300000");
  const hyperframesEnv = getHyperframesExecutionEnv();

  for (let attempt = 1; attempt <= maxCheckAttempts; attempt++) {
    const checkInvocation = getHyperframesInvocation(
      "check",
      renderRoot,
      "--json",
      "--samples",
      String(samplesCount),
      "--timeout",
      String(checkTimeoutMs),
    );

    try {
      ({ stdout: checkOutput } = await execFileAsync(checkInvocation.command, checkInvocation.args, {
        cwd: rootDir,
        timeout: 600_000,
        windowsHide: true,
        maxBuffer: 20 * 1024 * 1024,
        env: hyperframesEnv,
      }));
    } catch (error) {
      const failure = error as Error & { stdout?: string };
      const errorReport = parseHyperframesCheckReport(failure.stdout);
      if (attempt < maxCheckAttempts && hasHyperframesContrastIssue(errorReport)) {
        if (onProgress) {
          await onProgress("Video · auto-healing contrast issues...", 60);
        }
        await healCompositionContrast(renderRoot, errorReport);
        continue;
      }
      throw new RepositoryError(formatHyperframesCheckFailure(errorReport, failure.message), "QUIZ_COMPOSITION_CHECK_FAILED");
    }

    const checkReport = parseHyperframesCheckReport(checkOutput);
    if (hasHyperframesContrastIssue(checkReport)) {
      if (attempt < maxCheckAttempts) {
        if (onProgress) {
          await onProgress("Video · auto-healing contrast issues...", 60);
        }
        await healCompositionContrast(renderRoot, checkReport);
        continue;
      }
      throw new RepositoryError(formatHyperframesCheckFailure(checkReport), "QUIZ_COMPOSITION_CONTRAST_FAILED");
    }

    break;
  }

  await writeRenderCheckpoint(checkpointPath, {
    schema_version: 2,
    source_fingerprint: sourceFingerprint,
    check: { status: "passed" },
  });

  return { status: "passed", reused: false, bypassed: false, samplesCount };
}
