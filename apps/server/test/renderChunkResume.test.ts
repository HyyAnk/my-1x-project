import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resumeChunkRender, assertContinuousChunkPlan } from "../src/tasks/video/resume/resumeChunkRender.js";
import { fingerprintRenderInputs } from "../src/tasks/video/resume/renderInputSnapshot.js";
import type { ChunkPlan, RenderChunkPort } from "../src/tasks/video/resume/renderResume.types.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const plan: ChunkPlan = {
  planHash: "plan-a",
  totalFrames: 12,
  fps: 24,
  width: 320,
  height: 180,
  chunks: [
    { index: 0, startFrame: 0, endFrame: 4 },
    { index: 1, startFrame: 4, endFrame: 8 },
    { index: 2, startFrame: 8, endFrame: 12 },
  ],
};

async function fixture() {
  const cacheRoot = await mkdtemp(path.join(os.tmpdir(), "render-resume-"));
  roots.push(cacheRoot);
  const port: RenderChunkPort = {
    render: vi.fn<RenderChunkPort["render"]>(async (index, output) => {
      await writeFile(output, `chunk-${index}`);
    }),
    verify: vi.fn<RenderChunkPort["verify"]>(async (output, slice) => {
      if ((await readFile(output, "utf8")) !== `chunk-${slice.index}`) throw new Error("Invalid chunk");
    }),
    assemble: vi.fn<RenderChunkPort["assemble"]>(async (inputs, output) => {
      await writeFile(output, (await Promise.all(inputs.map((file) => readFile(file, "utf8")))).join("|"));
    }),
  };
  const options = { cacheRoot, outputPath: path.join(cacheRoot, "output.mp4"), plan, port, onProgress: vi.fn(async () => {}) };
  return { port, options };
}

describe("chunk resume", () => {
  it("retains verified chunks across capture failure and renders only the remaining ranges", async () => {
    const { port, options } = await fixture();
    vi.mocked(port.render)
      .mockImplementationOnce(async (_index, output) => {
        await writeFile(output, "chunk-0");
      })
      .mockRejectedValueOnce(new Error("Capture interrupted"));
    await expect(resumeChunkRender(options)).rejects.toThrow("Capture interrupted");
    vi.mocked(port.render).mockClear();
    await resumeChunkRender(options);
    expect(vi.mocked(port.render).mock.calls.map(([index]) => index)).toEqual([1, 2]);
    expect(await readFile(options.outputPath, "utf8")).toBe("chunk-0|chunk-1|chunk-2");
    expect(options.onProgress).toHaveBeenCalledWith(4, 12, 1);
  });
  it("retries assembly without recapturing frames", async () => {
    const { port, options } = await fixture();
    vi.mocked(port.assemble).mockRejectedValueOnce(new Error("Mux failed"));
    await expect(resumeChunkRender(options)).rejects.toThrow("Mux failed");
    vi.mocked(port.render).mockClear();
    await resumeChunkRender(options);
    expect(port.render).not.toHaveBeenCalled();
    expect(options.onProgress).toHaveBeenLastCalledWith(12, 12, 3);
  });
  it("rebuilds a corrupted completed chunk without discarding its neighbors", async () => {
    const { port, options } = await fixture();
    await resumeChunkRender(options);
    await writeFile(path.join(options.cacheRoot, "chunks", "00001.mp4"), "damaged");
    vi.mocked(port.render).mockClear();
    await resumeChunkRender(options);
    expect(vi.mocked(port.render).mock.calls.map(([index]) => index)).toEqual([1]);
  });
  it("does not reuse chunks from a different plan", async () => {
    const { port, options } = await fixture();
    await resumeChunkRender(options);
    vi.mocked(port.render).mockClear();
    await resumeChunkRender({ ...options, plan: { ...plan, planHash: "plan-b" } });
    expect(port.render).toHaveBeenCalledTimes(3);
  });
  it("preserves completed chunks on cancellation and never publishes a cancelled output", async () => {
    const { port, options } = await fixture();
    const controller = new AbortController();
    options.onProgress.mockImplementation((completed: number) => {
      if (completed === 4) controller.abort();
      return Promise.resolve();
    });
    await expect(resumeChunkRender({ ...options, signal: controller.signal })).rejects.toThrow();
    expect(port.assemble).not.toHaveBeenCalled();
    options.onProgress.mockResolvedValue(undefined);
    vi.mocked(port.render).mockClear();
    await resumeChunkRender({ ...options, signal: new AbortController().signal });
    expect(vi.mocked(port.render).mock.calls.map(([index]) => index)).toEqual([1, 2]);
  });
  it("rejects missing or overlapping frame ranges", () => {
    expect(() => assertContinuousChunkPlan({ ...plan, chunks: plan.chunks.slice(1) })).toThrow();
    expect(() => assertContinuousChunkPlan({ ...plan, totalFrames: 13 })).toThrow();
  });
  it("invalidates on actual soundtrack bytes and render settings, not output or timestamps", async () => {
    const { options } = await fixture();
    await writeFile(path.join(options.cacheRoot, "soundtrack.wav"), "audio-a");
    const initial = await fingerprintRenderInputs(options.cacheRoot, "draft");
    await writeFile(path.join(options.cacheRoot, "quiz-video.mp4"), "finished");
    expect(await fingerprintRenderInputs(options.cacheRoot, "draft")).toBe(initial);
    expect(await fingerprintRenderInputs(options.cacheRoot, "high")).not.toBe(initial);
    await writeFile(path.join(options.cacheRoot, "soundtrack.wav"), "audio-b");
    expect(await fingerprintRenderInputs(options.cacheRoot, "draft")).not.toBe(initial);
  });
});
