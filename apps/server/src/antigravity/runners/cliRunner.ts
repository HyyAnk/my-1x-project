import { spawn } from "node:child_process";
import type { TurnRunnerContext } from "../turnRunner.js";

function handleCliExecutionError(exitCode: number | null, fullOutput: string, errorOutput: string): never {
  const combined = `${errorOutput}\n${fullOutput}`.toLowerCase();
  if (/not logged in|unauthenticated|auth login|login required/i.test(combined)) {
    throw new Error("Antigravity authentication required: run 'agy auth login' to authenticate");
  }
  if (/quota|rate limit|429|resource_exhausted/i.test(combined)) {
    throw new Error("Antigravity quota exceeded: please wait or check your subscription plan");
  }
  if (!fullOutput.trim()) {
    throw new Error("Antigravity process terminated with empty output");
  }
  throw new Error(`Antigravity process failed with code ${exitCode}: ${errorOutput.slice(0, 300) || "unknown error"}`);
}

export async function runCliTurn(
  effectivePrompt: string,
  selectedModel: string,
  controller: AbortController,
  ctx: TurnRunnerContext,
): Promise<void> {
  const args = ["--model", selectedModel, "--prompt", effectivePrompt, "--output-format", "stream"];
  const child = spawn(ctx.target.command, args, {
    cwd: ctx.rootDirectory,
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(ctx.target.command),
    windowsHide: true,
  });

  let fullOutput = "";
  let errorOutput = "";

  child.stdout.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    fullOutput += text;
    ctx.onDelta(text);
  });

  child.stderr.on("data", (chunk: Buffer) => {
    errorOutput += chunk.toString();
    ctx.logger.debug(`Antigravity stderr: ${chunk.toString().trim()}`, { step: "antigravity_stderr" });
  });

  controller.signal.addEventListener("abort", () => {
    if (!child.killed) child.kill();
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on("exit", resolve);
    child.on("error", () => resolve(1));
  });

  if (controller.signal.aborted) {
    ctx.onCompleted("interrupted");
    return;
  }

  if (exitCode !== 0 || !fullOutput.trim()) {
    handleCliExecutionError(exitCode, fullOutput, errorOutput);
  }

  ctx.onCompleted("completed");
}
