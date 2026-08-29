import { readFile } from "node:fs/promises";
import { writeJsonAtomic } from "../utils/fs.js";

export type NarrationCheckpoint = {
  schema_version: 1;
  script_modified_at: string;
  segments: Record<string, { fingerprint: string; asset_path: string; duration_seconds: number }>;
};

export type RenderCheckpoint = {
  schema_version: 2;
  source_fingerprint: string;
  check: { status: "passed" };
  render?: { status: "passed" };
};

export async function readNarrationCheckpoint(filePath: string): Promise<NarrationCheckpoint | null> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as Partial<NarrationCheckpoint>;
    if (
      parsed.schema_version !== 1 ||
      typeof parsed.script_modified_at !== "string" ||
      !parsed.segments ||
      typeof parsed.segments !== "object"
    )
      return null;
    return parsed as NarrationCheckpoint;
  } catch {
    return null;
  }
}

export async function writeNarrationCheckpoint(filePath: string, checkpoint: NarrationCheckpoint): Promise<void> {
  await writeJsonAtomic(filePath, checkpoint);
}

export async function readRenderCheckpoint(filePath: string): Promise<RenderCheckpoint | null> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as RenderCheckpoint;
    if (parsed.schema_version !== 2 || typeof parsed.source_fingerprint !== "string" || parsed.check?.status !== "passed") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeRenderCheckpoint(filePath: string, checkpoint: RenderCheckpoint): Promise<void> {
  await writeJsonAtomic(filePath, checkpoint);
}

export type SoundtrackCheckpoint = {
  schema_version: 1;
  soundtrack_fingerprint: string;
  duration_seconds: number;
  bgm_track_id: string | null;
  bgm_filename: string | null;
  created_at: string;
};

export async function readSoundtrackCheckpoint(filePath: string): Promise<SoundtrackCheckpoint | null> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as Partial<SoundtrackCheckpoint>;
    if (parsed.schema_version !== 1 || typeof parsed.soundtrack_fingerprint !== "string") return null;
    return parsed as SoundtrackCheckpoint;
  } catch {
    return null;
  }
}

export async function writeSoundtrackCheckpoint(filePath: string, checkpoint: SoundtrackCheckpoint): Promise<void> {
  await writeJsonAtomic(filePath, checkpoint);
}

