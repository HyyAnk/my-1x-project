import { z } from "zod";

export const ChunkSliceSchema = z.object({
  index: z.number().int().nonnegative(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
});
export const ChunkPlanSchema = z.object({
  planHash: z.string().min(1),
  totalFrames: z.number().int().positive(),
  fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  chunks: z.array(ChunkSliceSchema).min(1),
});
export type ChunkPlan = z.infer<typeof ChunkPlanSchema>;
export type ChunkSlice = z.infer<typeof ChunkSliceSchema>;
export interface RenderChunkPort {
  render: (index: number, outputPath: string) => Promise<void>;
  assemble: (chunkPaths: string[], outputPath: string) => Promise<void>;
  verify: (outputPath: string, slice: ChunkSlice, plan: ChunkPlan) => Promise<void>;
}
export interface ResumeRenderOptions {
  cacheRoot: string;
  outputPath: string;
  plan: ChunkPlan;
  port: RenderChunkPort;
  signal?: AbortSignal;
  onProgress: (completedFrames: number, totalFrames: number, reusedChunks: number) => Promise<void>;
}
