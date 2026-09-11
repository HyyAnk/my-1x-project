import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { type FrameRate, type ResolvedTransitionInstance } from "@studio/shared";
import type { RenderEngineSnapshot } from "./renderEngineSnapshot.js";
import { buildRenderInvocation } from "./renderInvocationOptions.js";
import { runHyperframesProcess } from "./hyperframesProcess.js";
import { mapRenderTaskPercent } from "./hyperframesProgress.js";
import { mkdir, writeFile } from "node:fs/promises";
import {
  computeFileSha256,
  type TransitionPreviewArtifactManifest,
  type VerifiedPreviewArtifact,
} from "../../quiz/render/transitions/transitionPreviewStore.js";
import type {
  TransitionPreviewRunnerInput,
  TransitionPreviewRunnerPort,
} from "../../quiz/transitionPreview/transitionPreview.types.js";

const execFileAsync = promisify(execFile);

export type VideoFrameProbeResult = {
  frameCount: number;
  timeBase: { numerator: number; denominator: number };
  frames: readonly { index: number; pts: number }[];
  durationSeconds: number;
  width: number;
  height: number;
};

export async function probeVideoFrames(videoPath: string): Promise<VideoFrameProbeResult> {
  const result = await execFileAsync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,time_base,nb_read_packets:frame=pts,pkt_pts",
      "-count_packets",
      "-of",
      "json",
      videoPath,
    ],
    { timeout: 60_000, windowsHide: true },
  );

  const parsed = JSON.parse(result.stdout);
  const stream = parsed.streams?.[0] ?? {};
  const [tbNum, tbDen] = (stream.time_base || "1/1000").split("/").map(Number);
  const timeBase = { numerator: tbNum || 1, denominator: tbDen || 1000 };

  const rawFrames: Array<{ pts?: number; pkt_pts?: number }> = parsed.frames ?? [];
  const frames = rawFrames.map((f, index) => ({
    index,
    pts: f.pts !== undefined ? Number(f.pts) : f.pkt_pts !== undefined ? Number(f.pkt_pts) : index,
  }));

  return {
    frameCount: frames.length || Number(stream.nb_read_packets || 0),
    timeBase,
    frames,
    durationSeconds: frames.length ? (frames[frames.length - 1].pts * timeBase.numerator) / timeBase.denominator : 0,
    width: stream.width ?? 1920,
    height: stream.height ?? 1080,
  };
}

export type RenderTransitionPreviewOptions = {
  renderRoot: string;
  outputPath: string;
  snapshot: RenderEngineSnapshot;
  inputFingerprint: string;
  catalogRevision: string;
  sourceKind: "sample" | "episode";
  currentness: "matches-request" | "legacy-unverified";
  reviewWindow: { firstFrame: number; lastFrameInclusive: number; boundaryFrame: number };
  instances: readonly ResolvedTransitionInstance[];
  signal?: AbortSignal;
  logPath?: string;
  onProgress?: (progress: number) => void;
};

export async function renderTransitionPreviewArtifact(
  options: RenderTransitionPreviewOptions,
): Promise<VerifiedPreviewArtifact> {
  const {
    renderRoot,
    outputPath,
    snapshot,
    inputFingerprint,
    catalogRevision,
    sourceKind,
    currentness,
    reviewWindow,
    instances,
    signal,
    logPath = path.join(path.dirname(outputPath), "render.log"),
    onProgress,
  } = options;

  const invocation = buildRenderInvocation(snapshot, {
    renderRoot,
    outputPath,
  });

  await runHyperframesProcess({
    command: invocation.command,
    args: invocation.args,
    cwd: process.cwd(),
    env: invocation.env,
    timeoutMs: invocation.timeoutMs,
    logPath,
    signal,
    onProgress: async (event) => {
      if (event.kind === "measured" && onProgress) {
        onProgress(mapRenderTaskPercent(event.sample));
      }
    },
  });

  // Probe output video
  const probe = await probeVideoFrames(outputPath);
  const artifactSha256 = await computeFileSha256(outputPath);
  const artifactId = `art_${inputFingerprint.slice(0, 16)}_${artifactSha256.slice(0, 8)}`;

  const manifest: TransitionPreviewArtifactManifest = {
    artifactId,
    artifactSha256,
    inputFingerprint,
    catalogRevision,
    engineSnapshotHash: snapshot.snapshotHash,
    sourceKind,
    currentness,
    width: probe.width,
    height: probe.height,
    fps: { numerator: snapshot.fps, denominator: 1 },
    frameCount: probe.frameCount,
    timeBase: probe.timeBase,
    frames: probe.frames,
    reviewWindow,
    instances,
  };

  return {
    artifactId,
    videoPath: outputPath,
    manifest,
  };
}

export class HyperframesTransitionPreviewRunner implements TransitionPreviewRunnerPort {
  private readonly runtimeDir: string;

  constructor(options?: { runtimeDir?: string }) {
    this.runtimeDir = options?.runtimeDir ?? path.resolve(process.cwd(), "runtime", "transition-previews", "renders");
  }

  async render(input: TransitionPreviewRunnerInput): Promise<VerifiedPreviewArtifact> {
    const jobDir = path.join(this.runtimeDir, input.fingerprint);
    await mkdir(jobDir, { recursive: true });

    const htmlPath = path.join(jobDir, "index.html");
    await writeFile(htmlPath, input.specimen.html, "utf-8");

    for (const [relPath, content] of Object.entries(input.specimen.files)) {
      const fullPath = path.join(jobDir, relPath);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, "utf-8");
    }

    const outputPath = path.join(jobDir, "output.mp4");

    return renderTransitionPreviewArtifact({
      renderRoot: jobDir,
      outputPath,
      snapshot: input.snapshot,
      inputFingerprint: input.fingerprint,
      catalogRevision: input.catalogRevision,
      sourceKind: input.sourceKind,
      currentness: input.currentness,
      reviewWindow: input.specimen.reviewWindow,
      instances: [input.specimen.resolvedInstance],
      signal: input.signal,
      onProgress: (percent) => {
        if (input.onProgress) {
          const totalFrames = input.specimen.totalDurationFrames;
          const completedFrames = Math.round((percent / 100) * totalFrames);
          input.onProgress({
            phase: percent < 5 ? "prepare" : percent < 80 ? "capture" : "encode",
            completedFrames,
            totalFrames,
          });
        }
      },
    });
  }
}
