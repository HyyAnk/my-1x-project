import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { RepositoryError } from "../../repository.js";
import {
  formatHyperframesCheckFailure,
  hasHyperframesBlockingIssues,
  hasHyperframesContrastIssue,
  parseHyperframesCheckReport,
} from "../../quiz/qa/hyperframesQuality.js";
import { healCompositionContrast } from "../../quiz/qa/contrastHealer.js";
import { readRenderCheckpoint, writeRenderCheckpoint } from "../checkpoints.js";
import { getHyperframesInvocation } from "./videoInvocation.js";
import { getHyperframesExecutionEnv } from "./videoPerformance.js";
import { buildLayoutCheckArgs, getOptimalSampleCount, resolveLayoutCheckSampling, type LayoutCheckCanvas } from "./layoutCheckSampling.js";

export { getOptimalSampleCount, resolveLayoutCheckSampling, buildLayoutCheckArgs };

const execFileAsync = promisify(execFile);

export interface LayoutCheckOptions {
  renderRoot: string;
  rootDir: string;
  sourceFingerprint: string;
  fastRenderMode?: boolean;
  renderQuality?: "draft" | "standard" | "high";
  /** Output canvas; portrait canvases sample with the reserved caption band as an advisory zone. */
  renderCanvas?: LayoutCheckCanvas;
  onProgress?: (message: string, percent: number) => Promise<void> | void;
}

export interface LayoutCheckResult {
  status: "passed";
  reused: boolean;
  bypassed: boolean;
  samplesCount: number;
}

/** Both statuses allow fingerprint-keyed reuse; only "passed" carries QA evidence. */
function isCheckStatusReady(status: string | undefined): boolean {
  return status === "passed" || status === "skipped_fast_mode";
}

export async function verifyAndCheckLayout(options: LayoutCheckOptions): Promise<LayoutCheckResult> {
  const { renderRoot, rootDir, sourceFingerprint, fastRenderMode, renderQuality, renderCanvas, onProgress } = options;
  const checkpointPath = path.join(renderRoot, "render-checkpoint.json");
  const checkpoint = await readRenderCheckpoint(checkpointPath);

  const layoutReady = checkpoint?.source_fingerprint === sourceFingerprint && isCheckStatusReady(checkpoint.check.status);
  if (layoutReady) {
    if (onProgress) {
      await onProgress("Video · layout and media checks already passed", 58);
    }
    return { status: "passed", reused: true, bypassed: false, samplesCount: 0 };
  }

  const isFastMode = fastRenderMode !== undefined ? fastRenderMode : process.env.FAST_RENDER_MODE === "true";
  if (isFastMode) {
    if (onProgress) {
      await onProgress("Video · fast render mode: layout check skipped", 58);
    }
    await writeRenderCheckpoint(checkpointPath, {
      schema_version: 2,
      source_fingerprint: sourceFingerprint,
      check: { status: "skipped_fast_mode" },
    });
    return { status: "passed", reused: false, bypassed: true, samplesCount: 0 };
  }

  const sampling = resolveLayoutCheckSampling({ renderQuality, canvas: renderCanvas });
  const samplesCount = sampling.samplesCount;
  if (onProgress) {
    await onProgress(`Video · checking layout and media (${samplesCount} ${sampling.orientation} samples)`, 58);
  }

  let checkOutput: string;
  const maxCheckAttempts = 2;
  const checkTimeoutMs = Number(process.env.PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS || "300000");
  const hyperframesEnv = getHyperframesExecutionEnv();

  for (let attempt = 1; attempt <= maxCheckAttempts; attempt++) {
    const checkInvocation = getHyperframesInvocation("check", renderRoot, ...buildLayoutCheckArgs(sampling, checkTimeoutMs));

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

      if (errorReport && hasHyperframesBlockingIssues(errorReport)) {
        throw new RepositoryError(formatHyperframesCheckFailure(errorReport, failure.message), "QUIZ_COMPOSITION_CHECK_FAILED");
      }

      if (attempt < maxCheckAttempts && hasHyperframesContrastIssue(errorReport)) {
        if (onProgress) {
          await onProgress("Video · auto-healing contrast issues...", 60);
        }
        await healCompositionContrast(renderRoot, errorReport);
        continue;
      }

      if (errorReport && !hasHyperframesBlockingIssues(errorReport)) {
        break;
      }

      throw new RepositoryError(formatHyperframesCheckFailure(errorReport, failure.message), "QUIZ_COMPOSITION_CHECK_FAILED");
    }

    const checkReport = parseHyperframesCheckReport(checkOutput);

    if (hasHyperframesBlockingIssues(checkReport)) {
      throw new RepositoryError(formatHyperframesCheckFailure(checkReport), "QUIZ_COMPOSITION_CHECK_FAILED");
    }

    if (attempt < maxCheckAttempts && hasHyperframesContrastIssue(checkReport)) {
      if (onProgress) {
        await onProgress("Video · auto-healing contrast issues...", 60);
      }
      await healCompositionContrast(renderRoot, checkReport);
      continue;
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
