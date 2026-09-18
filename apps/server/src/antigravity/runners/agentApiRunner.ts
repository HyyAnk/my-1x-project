import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { discoverActiveSession } from "../discovery.js";
import { watchTranscriptStream } from "../transcriptWatcher.js";
import type { TurnRunnerContext } from "../turnRunner.js";
import type { ActiveSessionInfo } from "../types.js";

const execFileAsync = promisify(execFile);

function buildSessionEnv(session: ActiveSessionInfo): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...(session.address ? { ANTIGRAVITY_LS_ADDRESS: session.address } : {}),
    ...(session.csrfToken ? { ANTIGRAVITY_CSRF_TOKEN: session.csrfToken } : {}),
    ...(session.projectId ? { ANTIGRAVITY_PROJECT_ID: session.projectId } : {}),
  };
}

function resolveModelArg(selectedModel: string): string {
  if (selectedModel.includes("lite")) return "flash_lite";
  if (selectedModel.includes("pro")) return "pro";
  return "flash";
}

function extractConversationId(stdout: string): string {
  try {
    const parsed = JSON.parse(stdout) as { response?: { newConversation?: { conversationId?: string } } };
    const id = parsed.response?.newConversation?.conversationId;
    if (id) return id;
  } catch {
    // Fallback to regex extraction if output is not pure JSON
  }
  const match = stdout.match(/"conversationId":\s*"([^"]+)"/);
  return match ? match[1] : "";
}

export async function runAgentApiTurn(
  threadId: string,
  turnId: string,
  effectivePrompt: string,
  selectedModel: string,
  controller: AbortController,
  ctx: TurnRunnerContext,
): Promise<void> {
  const modelArg = resolveModelArg(selectedModel);
  const args = [...ctx.target.argsPrefix, "new-conversation", `--model=${modelArg}`, effectivePrompt];

  let result: { stdout: string; stderr: string };
  try {
    result = await execFileAsync(ctx.target.command, args, {
      cwd: ctx.rootDirectory,
      env: buildSessionEnv(ctx.session),
      timeout: 180_000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(ctx.target.command),
    });
  } catch (execErr: unknown) {
    const errObj = execErr as { message?: string; stdout?: string; stderr?: string };
    const details = errObj.stderr?.trim() || errObj.stdout?.trim() || errObj.message || "Unknown error";

    // Auto-heal: If language_server was restarted or port changed, refresh active session and retry once
    const isConnErr = /(?:connectex|connection error|actively refused|Unavailable desc = connection error|dial tcp)/i.test(details);
    if (isConnErr) {
      try {
        const refreshedSession = await discoverActiveSession(ctx.logger, true);
        ctx.session = refreshedSession;
        result = await execFileAsync(ctx.target.command, args, {
          cwd: ctx.rootDirectory,
          env: buildSessionEnv(refreshedSession),
          timeout: 180_000,
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024,
          shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(ctx.target.command),
        });
      } catch (retryErr: unknown) {
        const retryErrObj = retryErr as { message?: string; stdout?: string; stderr?: string };
        const retryDetails = retryErrObj.stderr?.trim() || retryErrObj.stdout?.trim() || retryErrObj.message || details;
        throw new Error(`Antigravity AgentAPI execution failed: ${retryDetails}`, { cause: retryErr });
      }
    } else {
      throw new Error(`Antigravity AgentAPI execution failed: ${details}`, { cause: execErr });
    }
  }

  const conversationId = extractConversationId(result.stdout);
  if (!conversationId) {
    throw new Error(`Antigravity AgentAPI did not return a conversation ID: ${result.stdout || result.stderr}`);
  }

  ctx.threadConversations.set(threadId, conversationId);

  await watchTranscriptStream(conversationId, threadId, turnId, controller, {
    onDelta: ctx.onDelta,
    onCompleted: ctx.onCompleted,
    logger: ctx.logger,
  });
}
