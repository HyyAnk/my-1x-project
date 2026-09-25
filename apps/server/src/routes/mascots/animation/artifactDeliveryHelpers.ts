import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AnimationStorageAdapter, VideoProcessingRepository } from "../../../quiz/mascot/videoAnimation/index.js";
import { EXTENSION_MIME_MAP } from "../../../utils/mediaMime.js";

export const ALLOWED_ARTIFACT_EXTENSIONS = new Set([".webm", ".png", ".jpg", ".jpeg", ".webp", ".json", ".mp4"]);

/**
 * Parses HTTP Range headers for chunked / seekable media streaming.
 */
export function parseRangeHeader(rangeHeader: string, fileSize: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;

  const rawStart = match[1];
  const rawEnd = match[2];

  let start: number;
  let end: number;

  if (rawStart === "" && rawEnd !== "") {
    const suffixLength = parseInt(rawEnd, 10);
    if (isNaN(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  } else if (rawStart !== "" && rawEnd === "") {
    start = parseInt(rawStart, 10);
    end = fileSize - 1;
  } else if (rawStart !== "" && rawEnd !== "") {
    start = parseInt(rawStart, 10);
    end = parseInt(rawEnd, 10);
  } else {
    return null;
  }

  if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
    return null;
  }

  end = Math.min(end, fileSize - 1);
  return { start, end };
}

/**
 * Streams an artifact file to the client, supporting HTTP 206 Partial Content range requests.
 */
export function sendArtifactFile(filePath: string, filename: string, request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === ".webm" ? "video/webm" : EXTENSION_MIME_MAP[ext] || "application/octet-stream";

  return fs.stat(filePath).then((stat) => {
    const fileSize = stat.size;
    const rangeHeader = request.headers.range;

    if (rangeHeader) {
      const range = parseRangeHeader(rangeHeader, fileSize);
      if (!range) {
        return reply
          .code(416)
          .headers({
            "content-range": `bytes */${fileSize}`,
            "accept-ranges": "bytes",
          })
          .send();
      }

      const { start, end } = range;
      const contentLength = end - start + 1;

      return reply
        .code(206)
        .headers({
          "content-type": contentType,
          "content-range": `bytes ${start}-${end}/${fileSize}`,
          "accept-ranges": "bytes",
          "content-length": contentLength,
          "cache-control": "no-store",
        })
        .send(createReadStream(filePath, { start, end }));
    }

    return reply
      .code(200)
      .headers({
        "content-type": contentType,
        "content-length": fileSize,
        "accept-ranges": "bytes",
        "cache-control": "no-store",
      })
      .send(createReadStream(filePath));
  });
}

export interface ResolveCandidateParams {
  outputBaseDir: string;
  storageAdapter: AnimationStorageAdapter;
  videoProcessingRepo: VideoProcessingRepository;
  mascotId: string;
  styleId: string;
  state: string;
  slotIndex: string;
  filename: string;
  attemptId?: number;
}

/**
 * Resolves candidate filesystem locations for a requested mascot animation artifact.
 */
export async function resolveArtifactCandidatePath(params: ResolveCandidateParams): Promise<string | null> {
  const { outputBaseDir, storageAdapter, videoProcessingRepo, mascotId, styleId, state, slotIndex, filename } = params;

  // 1. Try resolving via repository first
  const parsedSlot = parseInt(slotIndex, 10);
  if (parsedSlot >= 1 && parsedSlot <= 10 && (state === "thinking" || state === "celebrate")) {
    try {
      const resolvedFromRepo = await videoProcessingRepo.resolveArtifactPath(
        mascotId,
        styleId,
        state,
        parsedSlot,
        filename,
        params.attemptId,
      );
      if (resolvedFromRepo) {
        return resolvedFromRepo;
      }
      if (await videoProcessingRepo.getActiveRevision(mascotId, styleId, state, parsedSlot)) return null;
    } catch {
      // Fall back to candidate search
    }
  }

  // A pinned request must never fall through to an unrelated or unpublished attempt.
  if (params.attemptId !== undefined) return null;

  const slotDir = path.join(outputBaseDir, mascotId, styleId, state, String(slotIndex));
  const candidatePaths: string[] = [path.join(slotDir, filename)];

  try {
    const entries = await fs.readdir(slotDir, { withFileTypes: true });
    const attemptDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("attempt_"))
      .map((e) => e.name)
      .sort((a, b) => {
        const numA = parseInt(a.replace("attempt_", ""), 10) || 0;
        const numB = parseInt(b.replace("attempt_", ""), 10) || 0;
        return numB - numA;
      });
    for (const att of attemptDirs) {
      candidatePaths.push(path.join(slotDir, att, filename));
    }
  } catch {
    // Slot directory may not exist yet
  }

  try {
    if (parsedSlot >= 1 && parsedSlot <= 10 && (state === "thinking" || state === "celebrate")) {
      const videoSlotDir = storageAdapter.getSlotDir(mascotId, styleId, state, parsedSlot);
      candidatePaths.push(path.join(videoSlotDir, filename));
      const publishedDir = storageAdapter.getPublishedArtifactsDir(mascotId, styleId, state, parsedSlot);
      candidatePaths.push(path.join(publishedDir, filename));

      const attemptsDir = path.join(videoSlotDir, "attempts");
      const attemptEntries = await fs.readdir(attemptsDir, { withFileTypes: true });
      const atts = attemptEntries
        .filter((e) => e.isDirectory() && e.name.startsWith("att_"))
        .map((e) => e.name)
        .sort((a, b) => {
          const numA = parseInt(a.replace("att_", ""), 10) || 0;
          const numB = parseInt(b.replace("att_", ""), 10) || 0;
          return numB - numA;
        });
      for (const att of atts) {
        const attDir = path.join(attemptsDir, att);
        candidatePaths.push(path.join(attDir, filename));
        candidatePaths.push(path.join(attDir, "frames", "matted", filename));
        candidatePaths.push(path.join(attDir, "frames", "extracted", filename));
      }
    }
  } catch {
    // Ignore if videoSlotDir or attempts don't exist yet
  }

  for (const targetPath of candidatePaths) {
    try {
      const stat = await fs.stat(targetPath);
      if (stat.isFile()) {
        return targetPath;
      }
    } catch {
      // Try next candidate
    }
  }

  return null;
}
