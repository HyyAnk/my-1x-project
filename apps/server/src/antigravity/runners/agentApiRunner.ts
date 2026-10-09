import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { discoverActiveSession } from "../discovery.js";
import { watchTranscriptStream } from "../transcriptWatcher.js";
import type { TurnRunnerContext } from "../turnRunner.js";
import type { ActiveSessionInfo } from "../types.js";

const execFileAsync = promisify(execFile);

function buildSessionEnv(session: ActiveSessionInfo): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (session.address && session.csrfToken) {
    env.ANTIGRAVITY_LS_ADDRESS = session.address;
    env.ANTIGRAVITY_CSRF_TOKEN = session.csrfToken;
  } else {
    delete env.ANTIGRAVITY_LS_ADDRESS;
    delete env.ANTIGRAVITY_CSRF_TOKEN;
  }
  if (session.projectId) {
    env.ANTIGRAVITY_PROJECT_ID = session.projectId;
  }
  return env;
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
      timeout: 600_000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(ctx.target.command),
    });
  } catch (execErr: unknown) {
    const errObj = execErr as { message?: string; stdout?: string; stderr?: string };
    const details = errObj.stderr?.trim() || errObj.stdout?.trim() || errObj.message || "Unknown error";

    // Auto-heal: If language_server was restarted, port changed, or CSRF token expired/unauthenticated, refresh active session and retry once
    const isRecoverableSessionError =
      /(?:connectex|connection error|actively refused|unavailable|unauthenticated|missing csrf token|invalid csrf token|csrf_token|dial tcp|transport: error while dialing)/i.test(
        details,
      );
    if (isRecoverableSessionError) {
      try {
        ctx.logger.warn(`Antigravity AgentAPI recoverable session error: ${details}. Refreshing session and retrying...`, {
          step: "antigravity_agentapi_retry",
        });
        const refreshedSession = ctx.refreshSession
          ? await ctx.refreshSession()
          : await discoverActiveSession(ctx.logger, true);
        ctx.session = refreshedSession;
        result = await execFileAsync(ctx.target.command, args, {
          cwd: ctx.rootDirectory,
          env: buildSessionEnv(refreshedSession),
          timeout: 600_000,
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024,
          shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(ctx.target.command),
        });
      } catch (retryErr: unknown) {
        const retryErrObj = retryErr as { message?: string; stdout?: string; stderr?: string };
        const retryDetails = retryErrObj.stderr?.trim() || retryErrObj.stdout?.trim() || retryErrObj.message || details;

        const isStillConnError = /(?:connectex|connection error|actively refused|unavailable|dial tcp|wsarecv)/i.test(retryDetails);
        if (isStillConnError) {
          try {
            ctx.logger.warn(`Antigravity AgentAPI retry with explicit session failed (${retryDetails}). Attempting native auto-discovery fallback...`, {
              step: "antigravity_agentapi_native_fallback",
            });
            const fallbackSession: ActiveSessionInfo = {
              address: null,
              csrfToken: null,
              projectId: ctx.session?.projectId ?? null,
            };
            result = await execFileAsync(ctx.target.command, args, {
              cwd: ctx.rootDirectory,
              env: buildSessionEnv(fallbackSession),
              timeout: 600_000,
              windowsHide: true,
              maxBuffer: 10 * 1024 * 1024,
              shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(ctx.target.command),
            });
          } catch (fallbackErr: unknown) {
            const fallbackErrObj = fallbackErr as { message?: string; stdout?: string; stderr?: string };
            const fallbackDetails = fallbackErrObj.stderr?.trim() || fallbackErrObj.stdout?.trim() || fallbackErrObj.message || retryDetails;
            throw new Error(`Antigravity AgentAPI execution failed: ${fallbackDetails}`, { cause: fallbackErr });
          }
        } else {
          throw new Error(`Antigravity AgentAPI execution failed: ${retryDetails}`, { cause: retryErr });
        }
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
