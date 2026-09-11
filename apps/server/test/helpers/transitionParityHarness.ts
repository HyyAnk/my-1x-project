import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { HyperframesRenderer } from "../../src/quiz/render/hyperframesRenderer.js";
import { copyCandyArcadeFonts } from "../../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { getHyperframesInvocation } from "../../src/tasks/video/videoInvocation.js";
import type { TransitionFixture } from "./transitionFixtures.js";

export async function captureProductionBoundary(
  fixture: TransitionFixture,
  frameIndex: number,
): Promise<Buffer> {
  const renderer = new HyperframesRenderer();
  const fps = fixture.boundaryIdentity.fps.numerator / fixture.boundaryIdentity.fps.denominator;
  const captureTimeSeconds = frameIndex / fps;

  const projectDir = await mkdtemp(path.join(tmpdir(), "transition-parity-"));

  try {
    // 1. Prepare through HyperframesRenderer.prepare (must not call buildSandboxComposition)
    const prepared = await renderer.prepare({
      quiz: fixture.quiz,
      director: fixture.director,
      timeline: fixture.timeline,
      styleContext: fixture.styleContext,
      audioPath: "./soundtrack.wav",
      narrationDurationSeconds: fixture.timeline.duration_seconds,
      aspectRatio: fixture.aspectRatio,
      assets: fixture.assets,
      fps: fps,
    });

    // 2. Write index.html and composition files to projectDir
    await writeFile(path.join(projectDir, "index.html"), prepared.html, "utf8");
    for (const [relPath, content] of Object.entries(prepared.compositionFiles)) {
      const fullPath = path.join(projectDir, relPath);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, "utf8");
    }

    // 3. Copy fonts and write dummy audio soundtrack
    await copyCandyArcadeFonts(projectDir, process.cwd());
    await writeFile(path.join(projectDir, "soundtrack.wav"), Buffer.alloc(1024 * 30, 0));

    // 4. Run hyperframes snapshot at absolute frame time
    const outputDir = path.join(projectDir, "snapshots");
    await runHyperframesSnapshot(projectDir, outputDir, captureTimeSeconds);

    // 5. Read captured PNG
    return await readCapturedFrame(outputDir);
  } finally {
    await rm(projectDir, { recursive: true, force: true });
  }
}

function runHyperframesSnapshot(projectDir: string, outputDir: string, timeSeconds: number): Promise<void> {
  const invocation = getHyperframesInvocation(
    "snapshot",
    projectDir,
    "--at",
    timeSeconds.toFixed(4),
    "--no-end",
    "--no-browser-gpu",
    "--describe",
    "false",
    "--timeout",
    "15000",
    "-o",
    outputDir,
  );

  return new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Hyperframes snapshot failed with code ${code}:\n${output.slice(-2000)}`));
    });
  });
}

async function readCapturedFrame(outputDir: string): Promise<Buffer> {
  const entries = await readdir(outputDir);
  const frameFile = entries.find((name) => name.endsWith(".png"));
  if (!frameFile) {
    throw new Error(`Hyperframes snapshot produced no PNG in ${outputDir}`);
  }
  return readFile(path.join(outputDir, frameFile));
}
