import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { writeJsonAtomic } from "../../../utils/fs.js";
import type { ChunkPlan, ChunkSlice, RenderChunkPort } from "./renderResume.types.js";

const ReceiptSchema = z.object({
  version: z.literal(1),
  planHash: z.string(),
  index: z.number(),
  startFrame: z.number(),
  endFrame: z.number(),
  sha256: z.string().length(64),
});
export async function hashRenderFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const buffer of createReadStream(filePath)) {
    if (!Buffer.isBuffer(buffer)) throw new Error("Expected binary render input");
    hash.update(buffer);
  }
  return hash.digest("hex");
}

export async function isVerifiedChunk(filePath: string, slice: ChunkSlice, plan: ChunkPlan, port: RenderChunkPort): Promise<boolean> {
  try {
    const receipt = ReceiptSchema.parse(JSON.parse(await readFile(`${filePath}.json`, "utf8")));
    if (
      receipt.planHash !== plan.planHash ||
      receipt.index !== slice.index ||
      receipt.startFrame !== slice.startFrame ||
      receipt.endFrame !== slice.endFrame
    )
      return false;
    if ((await hashRenderFile(filePath)) !== receipt.sha256) return false;
    await port.verify(filePath, slice, plan);
    return true;
  } catch {
    return false;
  }
}

export async function commitChunkReceipt(filePath: string, slice: ChunkSlice, plan: ChunkPlan): Promise<void> {
  await writeJsonAtomic(`${filePath}.json`, { version: 1, planHash: plan.planHash, ...slice, sha256: await hashRenderFile(filePath) });
}
