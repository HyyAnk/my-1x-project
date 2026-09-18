import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { CandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { copyCandyArcadeFonts } from "../src/quiz/render/candyArcade/candyArcadeFonts.js";
import { type HyperframesCheckReport, type HyperframesFinding, parseHyperframesCheckReport } from "../src/quiz/qa/hyperframesQuality.js";
import { getHyperframesInvocation } from "../src/tasks/video/videoInvocation.js";
import { getHyperframesExecutionEnv } from "../src/tasks/video/videoPerformance.js";

const execFileAsync = promisify(execFile);

export interface CliCheckExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  report: HyperframesCheckReport | null;
}

export function createSilentWavBuffer(seconds = 1, sampleRate = 44100): Buffer {
  const numSamples = Math.floor(seconds * sampleRate);
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  return buffer;
}

export async function writeCompositionBundle(
  renderRoot: string,
  bundle: CandyArcadeCompositionBundle,
  serverRootDir: string,
  audioBuffer?: Buffer,
): Promise<void> {
  await mkdir(renderRoot, { recursive: true });
  await writeFile(path.join(renderRoot, "index.html"), bundle.html, "utf8");

  for (const [relPath, content] of Object.entries(bundle.files)) {
    const fullPath = path.join(renderRoot, relPath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf8");
  }

  await copyCandyArcadeFonts(renderRoot, serverRootDir);
  const audio = audioBuffer ?? createSilentWavBuffer(5);
  await writeFile(path.join(renderRoot, "soundtrack.wav"), audio);
}

export async function runHyperframesCheckCli(
  renderRoot: string,
  options: { samples?: number; timeoutMs?: number; cwd?: string } = {},
): Promise<CliCheckExecutionResult> {
  const { samples = 1, timeoutMs = 20000, cwd = process.cwd() } = options;
  const invocation = getHyperframesInvocation("check", renderRoot, "--json", "--samples", String(samples), "--timeout", String(timeoutMs));
  const env = getHyperframesExecutionEnv();

  try {
    const { stdout, stderr } = await execFileAsync(invocation.command, invocation.args, {
      cwd,
      timeout: timeoutMs + 30000,
      env,
    });
    return { stdout, stderr, exitCode: 0, report: parseHyperframesCheckReport(stdout) };
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      exitCode: failure.code ?? 1,
      report: parseHyperframesCheckReport(failure.stdout),
    };
  }
}

export function findFindingsByCode(report: HyperframesCheckReport | null, code: string): Array<HyperframesFinding & { code?: string }> {
  const findings: Array<HyperframesFinding & { code?: string }> = [];
  const lintFindings = (report?.lint?.findings ?? []) as Array<HyperframesFinding & { code?: string }>;
  for (const f of lintFindings) {
    if (f.code === code) findings.push(f);
  }
  return findings;
}
