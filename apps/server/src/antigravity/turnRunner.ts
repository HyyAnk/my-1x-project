import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { runAgentApiTurn } from "./runners/agentApiRunner.js";
import { runCliTurn } from "./runners/cliRunner.js";
import { runGoogleApiTurn } from "./runners/googleApiRunner.js";
import type { ActiveSessionInfo, ResolvedAntigravityTarget } from "./types.js";

export type TurnRunnerContext = {
  rootDirectory: string;
  config: AppConfig;
  logger: StudioLogger;
  target: ResolvedAntigravityTarget;
  session: ActiveSessionInfo;
  threadConversations: Map<string, string>;
  onDelta: (delta: string) => void;
  onCompleted: (status: "completed" | "interrupted" | "failed", error?: string) => void;
};

export { runAgentApiTurn, runGoogleApiTurn, runCliTurn };

const PROMPT_FILE_THRESHOLD = 24_000;
const DEFAULT_FALLBACK_MODEL = "gemini-3.1-flash-image";

async function persistLargePromptToFile(prompt: string, threadId: string, rootDirectory: string): Promise<string> {
  const promptDir = path.join(rootDirectory, ".context");
  await mkdir(promptDir, { recursive: true });
  const promptFile = path.join(promptDir, `task_prompt_${threadId}.md`);
  await writeFile(promptFile, prompt, "utf8");
  return promptFile;
}

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
    const selectedModel = rawModel || DEFAULT_FALLBACK_MODEL;

    let effectivePrompt = prompt;
    if (prompt.length > PROMPT_FILE_THRESHOLD) {
      promptFile = await persistLargePromptToFile(prompt, threadId, ctx.rootDirectory);
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
      await rm(promptFile, { force: true }).catch((error: unknown) => {
        ctx.logger.debug(`Failed to remove completed turn prompt: ${error instanceof Error ? error.message : "unknown error"}`, {
          step: "antigravity_prompt_file_remove",
          filePath: promptFile ?? undefined,
          workerId: threadId,
        });
      });
    }
  }
}
