import { spawn, execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { AppConfig } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { removePathIfPresent, saveManagedSessions } from "./sessionManager.js";
import { watchTranscriptStream } from "./transcriptWatcher.js";
import type { ActiveSessionInfo, ResolvedAntigravityTarget } from "./types.js";

const execFileAsync = promisify(execFile);

export type TurnRunnerContext = {
  rootDirectory: string;
  config: AppConfig;
  logger: StudioLogger;
  target: ResolvedAntigravityTarget;
  session: ActiveSessionInfo;
  threadConversations: Map<string, string>;
  managedConversations: Set<string>;
  managedSessionsFile: string;
  onDelta: (delta: string) => void;
  onCompleted: (status: "completed" | "interrupted" | "failed", error?: string) => void;
};

export async function executeTurn(
  threadId: string,
  turnId: string,
  prompt: string,
  controller: AbortController,
  ctx: TurnRunnerContext,
  modelOverride?: string,
): Promise<void> {
  let promptFile: string | null = null;
  try {
    const rawModel = modelOverride?.trim() || ctx.config.antigravity.model.trim();
    const selectedModel = rawModel || "gemini-3.1-flash-image";

    let effectivePrompt = prompt;
    if (prompt.length > 24_000) {
      const promptDir = path.join(ctx.rootDirectory, ".context");
      await mkdir(promptDir, { recursive: true });
      promptFile = path.join(promptDir, `task_prompt_${threadId}.md`);
      await writeFile(promptFile, prompt, "utf8");
      const promptFileUrl = `file:///${promptFile.replace(/\\/g, "/")}`;
      effectivePrompt = `Please read the complete task instructions and context from ${promptFileUrl} using view_file and execute the task strictly following those instructions. Do NOT run any other tools, codebase searches, or command executions. Produce the final output directly in your response.`;
    }

    if (ctx.target.kind === "agentapi") {
      await runAgentApiTurn(threadId, turnId, effectivePrompt, selectedModel, controller, ctx);
      return;
    }

    if (ctx.target.kind === "api" && ctx.config.antigravity.api_key.trim()) {
      await runGoogleApiTurn(effectivePrompt, selectedModel, controller, ctx);
      return;
    }

    await runCliTurn(effectivePrompt, selectedModel, controller, ctx);
  } catch (error) {
    if (controller.signal.aborted) {
      ctx.onCompleted("interrupted");
    } else {
      const message = error instanceof Error ? error.message : "Antigravity turn execution failed";
      ctx.onCompleted("failed", message);
    }
  } finally {
    if (promptFile) {
      await removePathIfPresent(promptFile, "remove completed turn prompt", { threadId }, false, ctx.logger);
    }
  }
}

async function runAgentApiTurn(
  threadId: string,
  turnId: string,
  effectivePrompt: string,
  selectedModel: string,
  controller: AbortController,
  ctx: TurnRunnerContext,
): Promise<void> {
  const env = {
    ...process.env,
    ...(ctx.session.address ? { ANTIGRAVITY_LS_ADDRESS: ctx.session.address } : {}),
    ...(ctx.session.csrfToken ? { ANTIGRAVITY_CSRF_TOKEN: ctx.session.csrfToken } : {}),
    ...(ctx.session.projectId ? { ANTIGRAVITY_PROJECT_ID: ctx.session.projectId } : {}),
  };

  const modelArg = selectedModel.includes("lite") ? "flash_lite" : selectedModel.includes("pro") ? "pro" : "flash";
  const args = [...ctx.target.argsPrefix, "new-conversation", `--model=${modelArg}`, effectivePrompt];

  let result: { stdout: string; stderr: string };
  try {
    result = await execFileAsync(ctx.target.command, args, {
      cwd: ctx.rootDirectory,
      env,
      timeout: 180_000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(ctx.target.command),
    });
  } catch (execErr: unknown) {
    const errObj = execErr as { message?: string; stdout?: string; stderr?: string };
    const details = errObj.stderr?.trim() || errObj.stdout?.trim() || errObj.message || "Unknown error";
    throw new Error(`Antigravity AgentAPI execution failed: ${details}`);
  }

  let conversationId = "";
  try {
    const parsed = JSON.parse(result.stdout) as { response?: { newConversation?: { conversationId?: string } } };
    conversationId = parsed.response?.newConversation?.conversationId ?? "";
  } catch {
    const match = result.stdout.match(/"conversationId":\s*"([^"]+)"/);
    if (match) conversationId = match[1];
  }

  if (!conversationId) {
    throw new Error(`Antigravity AgentAPI did not return a conversation ID: ${result.stdout || result.stderr}`);
  }

  ctx.threadConversations.set(threadId, conversationId);
  ctx.managedConversations.add(conversationId);
  void saveManagedSessions(ctx.managedSessionsFile, ctx.managedConversations, ctx.logger);

  await watchTranscriptStream(conversationId, threadId, turnId, controller, {
    onDelta: ctx.onDelta,
    onCompleted: ctx.onCompleted,
    logger: ctx.logger,
  });
}

async function runGoogleApiTurn(
  effectivePrompt: string,
  selectedModel: string,
  controller: AbortController,
  ctx: TurnRunnerContext,
): Promise<void> {
  const base = (ctx.config.antigravity.api_base_url.trim() || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
  const apiKey = ctx.config.antigravity.api_key.trim();
  const url = `${base}/models/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: effectivePrompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error("Antigravity authentication required: Google AI API key is invalid or unauthorized");
    }
    if (response.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(raw)) {
      throw new Error("Antigravity quota exceeded: Google AI rate limit or quota exceeded");
    }
    throw new Error(`Google AI request failed (${response.status}): ${raw.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const output = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!output.trim()) {
    throw new Error("Antigravity process terminated with empty output");
  }

  ctx.onDelta(output);
  ctx.onCompleted("completed");
}

async function runCliTurn(
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

  ctx.onCompleted("completed");
}
