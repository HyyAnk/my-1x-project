import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { BridgeSceneConfig, IntroOutroSnapshot } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { buildRetimedNarrationFilter, uploadedMediaTiming } from "../../quiz/introOutro/renderTiming.js";
import { buildFfmpegFilterComplexArgs } from "../../utils/ffmpegFilterScript.js";
import type { RequiredQuizRenderArtifacts } from "./quizRenderArtifacts.types.js";

const execFileAsync = promisify(execFile);
type NarrationFile = { absolutePath: string; modified_at: string; size: number };

/** Render-local migration preserves all original artifacts, making retries safe. */
export async function prepareIntroOutroTiming(
  repository: RepositoryService,
  renderRoot: string,
  artifacts: RequiredQuizRenderArtifacts,
  snapshot: IntroOutroSnapshot,
  narration: NarrationFile,
  context?: { topic?: string; channelName?: string; bridgeConfig?: BridgeSceneConfig },
): Promise<{ artifacts: RequiredQuizRenderArtifacts; narration: NarrationFile }> {
  const next = uploadedMediaTiming(
    {
      ...artifacts,
      topic: context?.topic,
      channelName: context?.channelName,
      bridgeConfig: context?.bridgeConfig,
    },
    snapshot,
  );
  if (JSON.stringify(next.timeline) === JSON.stringify(artifacts.timeline)) {
    return { artifacts: { ...artifacts, ...next }, narration };
  }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: 1,
        snapshot,
        old: artifacts.timeline,
        next: next.timeline,
        modified: narration.modified_at,
        size: narration.size,
      }),
    )
    .digest("hex");
  const output = path.join(renderRoot, "retimed-narration.wav");
  const checkpoint = path.join(renderRoot, "retimed-narration.json");
  let cached = false;
  try {
    cached = (await readFile(checkpoint, "utf8")) === fingerprint && (await stat(output)).size > 44;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  if (!cached) {
    const filter = buildRetimedNarrationFilter(artifacts.timeline, next.timeline);
    const filterScriptPath = path.join(renderRoot, "retimed-narration-filter.txt");
    await writeFile(filterScriptPath, filter, "utf8");
    const filterArgs = await buildFfmpegFilterComplexArgs(filterScriptPath);
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i",
        narration.absolutePath,
        ...filterArgs,
        "-map",
        "[out]",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-c:a",
        "pcm_s16le",
        output,
      ],
      { timeout: 180_000, windowsHide: true },
    );
    await repository.writeTextAtomic(checkpoint, fingerprint);
  }
  const metadata = await stat(output);
  return {
    artifacts: { ...artifacts, ...next },
    narration: { absolutePath: output, modified_at: metadata.mtime.toISOString(), size: metadata.size },
  };
}
