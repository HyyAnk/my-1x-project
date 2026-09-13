import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { commitChunkReceipt, isVerifiedChunk } from "./renderChunkStore.js";
import type { ChunkPlan, ResumeRenderOptions } from "./renderResume.types.js";

export function assertContinuousChunkPlan(plan: ChunkPlan): void {
  let end = 0;
  for (const [index, slice] of plan.chunks.entries()) {
    if (slice.index !== index || slice.startFrame !== end || slice.endFrame <= end)
      throw new Error("Render plan has invalid or overlapping frame ranges");
    end = slice.endFrame;
  }
  if (end !== plan.totalFrames) throw new Error("Render plan does not cover the complete video");
}

/** Completed chunks survive capture/encode/assembly failures and process death. */
export async function resumeChunkRender(options: ResumeRenderOptions): Promise<void> {
  const { plan, port, signal } = options;
  assertContinuousChunkPlan(plan);
  const chunkRoot = path.join(options.cacheRoot, "chunks");
  await mkdir(chunkRoot, { recursive: true });
  const paths = plan.chunks.map((slice) => path.join(chunkRoot, `${String(slice.index).padStart(5, "0")}.mp4`));
  const ready = new Set<number>();
  let completed = 0;
  for (const slice of plan.chunks) {
    signal?.throwIfAborted();
    if (await isVerifiedChunk(paths[slice.index], slice, plan, port)) {
      ready.add(slice.index);
      completed += slice.endFrame - slice.startFrame;
    }
  }
  const reused = ready.size;
  await options.onProgress(completed, plan.totalFrames, reused);
  // The SDK mutates/restores process-global runtime settings per chunk. Run
  // chunks sequentially; each chunk already uses the configured Chrome workers.
  for (const slice of plan.chunks) {
    if (ready.has(slice.index)) continue;
    signal?.throwIfAborted();
    const output = paths[slice.index];
    const partial = `${output}.partial.mp4`;
    await port.render(slice.index, partial);
    signal?.throwIfAborted();
    await port.verify(partial, slice, plan);
    await rename(partial, output);
    await commitChunkReceipt(output, slice, plan);
    completed += slice.endFrame - slice.startFrame;
    await options.onProgress(completed, plan.totalFrames, reused);
  }
  signal?.throwIfAborted();
  const assembledPath = `${options.outputPath}.assembling.mp4`;
  await port.assemble(paths, assembledPath);
  signal?.throwIfAborted();
  await rename(assembledPath, options.outputPath);
}
