import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { TransitionDomainError } from "@studio/shared";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type DecodeVideoFrameOptions = {
  videoPath: string;
  frameIndex: number;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function decodeVideoFrameToPng(options: DecodeVideoFrameOptions): Promise<Buffer> {
  const { videoPath, frameIndex, signal, timeoutMs = 15_000 } = options;

  if (!Number.isInteger(frameIndex) || frameIndex < 0) {
    throw new TransitionDomainError("INVALID_TIMING", `Invalid frame index: ${frameIndex}`);
  }

  try {
    const fileStat = await stat(videoPath);
    if (fileStat.size === 0) {
      throw new TransitionDomainError("DECODE_FAILED", `Video file is empty: ${videoPath}`);
    }
  } catch (err: any) {
    if (err instanceof TransitionDomainError) throw err;
    throw new TransitionDomainError("DECODE_FAILED", `Cannot access video file: ${videoPath}`);
  }

  if (signal?.aborted) {
    throw new TransitionDomainError("DECODE_FAILED", "Frame decode aborted");
  }

  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-i",
      videoPath,
      "-vf",
      `select=eq(n\\,${frameIndex})`,
      "-vframes",
      "1",
      "-pix_fmt",
      "rgba",
      "-f",
      "image2pipe",
      "-c:v",
      "png",
      "pipe:1",
    ];

    const child = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const chunks: Buffer[] = [];
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      reject(new TransitionDomainError("DECODE_FAILED", `Frame decode timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const onAbort = () => {
      clearTimeout(timer);
      child.kill("SIGKILL");
      reject(new TransitionDomainError("DECODE_FAILED", "Frame decode aborted"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      if (timedOut) return;

      if (code !== 0) {
        return reject(
          new TransitionDomainError("DECODE_FAILED", `FFmpeg decode exited with code ${code}: ${stderr.slice(-500)}`),
        );
      }

      const buffer = Buffer.concat(chunks);
      if (buffer.length < PNG_MAGIC.length || !buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
        return reject(
          new TransitionDomainError(
            "DECODE_FAILED",
            `Decode produced invalid PNG for frame ${frameIndex} (received ${buffer.length} bytes): ${stderr.slice(-200)}`,
          ),
        );
      }

      resolve(buffer);
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
      reject(new TransitionDomainError("DECODE_FAILED", `Failed to spawn FFmpeg decoder: ${err.message}`));
    });
  });
}

export async function decodeVideoFrameToRawRgba(
  videoPath: string,
  frameIndex: number,
  signal?: AbortSignal,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-i",
      videoPath,
      "-vf",
      `select=eq(n\\,${frameIndex})`,
      "-vframes",
      "1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "pipe:1",
    ];

    const child = spawn("ffmpeg", args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const chunks: Buffer[] = [];
    let stderr = "";

    const onAbort = () => {
      child.kill("SIGKILL");
      reject(new Error("Reference raw decode aborted"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf-8")));

    child.on("close", (code) => {
      if (signal) signal.removeEventListener("abort", onAbort);
      if (code !== 0) {
        return reject(new Error(`FFmpeg raw decode failed with code ${code}: ${stderr.slice(-500)}`));
      }
      resolve(Buffer.concat(chunks));
    });

    child.on("error", (err) => {
      if (signal) signal.removeEventListener("abort", onAbort);
      reject(err);
    });
  });
}

export async function decodePngToRawRgba(pngBuffer: Buffer, signal?: AbortSignal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = ["-v", "error", "-i", "pipe:0", "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"];

    const child = spawn("ffmpeg", args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const chunks: Buffer[] = [];
    let stderr = "";

    const onAbort = () => {
      child.kill("SIGKILL");
      reject(new Error("PNG to raw RGBA decode aborted"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf-8")));

    child.on("close", (code) => {
      if (signal) signal.removeEventListener("abort", onAbort);
      if (code !== 0) {
        return reject(new Error(`PNG decode failed with code ${code}: ${stderr.slice(-500)}`));
      }
      resolve(Buffer.concat(chunks));
    });

    child.on("error", (err) => {
      if (signal) signal.removeEventListener("abort", onAbort);
      reject(err);
    });

    child.stdin.write(pngBuffer);
    child.stdin.end();
  });
}
