import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import {
  assembleV2,
  materializePlanV2Target,
  planV2,
  readPlanV2Manifest,
  renderChunkV2,
  type DistributedRenderConfig,
} from "@hyperframes/producer/distributed";
import { writeJsonAtomic } from "../../../utils/fs.js";
import { snapshotRenderInputs, fingerprintRenderInputs } from "./renderInputSnapshot.js";
import { ChunkPlanSchema, ChunkSliceSchema, type ChunkPlan, type RenderChunkPort } from "./renderResume.types.js";

const execFileAsync = promisify(execFile);
const PointerSchema = z.object({ fingerprint: z.string(), generation: z.string().uuid(), plan: ChunkPlanSchema });
const ProbeSchema = z.object({
  streams: z.array(z.object({ width: z.number(), height: z.number(), r_frame_rate: z.string(), nb_read_frames: z.string() })),
});

export async function prepareResumablePlan(
  renderRoot: string,
  config: DistributedRenderConfig,
  configFingerprint: string,
): Promise<{ cacheRoot: string; planDir: string; plan: ChunkPlan }> {
  const fingerprint = await fingerprintRenderInputs(renderRoot, configFingerprint);
  const root = path.join(renderRoot, ".render-resume");
  const pointerPath = path.join(root, "current.json");
  try {
    const saved = PointerSchema.parse(JSON.parse(await readFile(pointerPath, "utf8")));
    const cacheRoot = path.join(root, saved.generation);
    const planDir = path.join(cacheRoot, "plan");
    if (saved.fingerprint === fingerprint && readPlanV2Manifest(planDir).planHash === saved.plan.planHash)
      return { cacheRoot, planDir, plan: saved.plan };
  } catch {
    /* Missing/corrupt plan is rebuilt; old verified generations stay recoverable. */
  }

  const generation = randomUUID();
  const cacheRoot = path.join(root, generation);
  const inputRoot = path.join(cacheRoot, "input");
  const planDir = path.join(cacheRoot, "plan");
  await snapshotRenderInputs(renderRoot, inputRoot);
  if ((await fingerprintRenderInputs(inputRoot, configFingerprint)) !== fingerprint)
    throw new Error("Render inputs changed while taking a snapshot. Retry the build.");
  const result = await planV2(inputRoot, config, planDir);
  const metadataRoot = path.join(cacheRoot, "metadata");
  materializePlanV2Target(planDir, { role: "assembler" }, metadataRoot);
  const chunks = z.array(ChunkSliceSchema).parse(JSON.parse(await readFile(path.join(metadataRoot, "meta", "chunks.json"), "utf8")));
  const plan = ChunkPlanSchema.parse({ ...result, chunks });
  await writeJsonAtomic(pointerPath, { fingerprint, generation, plan });
  return { cacheRoot, planDir, plan };
}

export function createHyperframesChunkPort(planDir: string): RenderChunkPort {
  return {
    async render(index, output) {
      await renderChunkV2(planDir, index, output);
    },
    async assemble(chunks, output) {
      await assembleV2(planDir, chunks, output);
    },
    async verify(output, slice, plan) {
      const { stdout } = await execFileAsync(
        "ffprobe",
        [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-count_frames",
          "-show_entries",
          "stream=width,height,r_frame_rate,nb_read_frames",
          "-of",
          "json",
          output,
        ],
        { windowsHide: true, timeout: 60_000 },
      );
      const stream = ProbeSchema.parse(JSON.parse(stdout)).streams[0];
      const [num, den] = stream?.r_frame_rate.split("/").map(Number) ?? [];
      if (
        !stream ||
        stream.width !== plan.width ||
        stream.height !== plan.height ||
        num / den !== plan.fps ||
        Number(stream.nb_read_frames) !== slice.endFrame - slice.startFrame
      )
        throw new Error(`Render chunk ${slice.index + 1} failed frame-count or video-format validation`);
    },
  };
}
