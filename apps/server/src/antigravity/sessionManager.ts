import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StudioLogger } from "../logger.js";
import { getAntigravityBaseDir } from "./discovery.js";
import { describeError, isNotFoundError, type ActiveSessionInfo } from "./types.js";

export async function loadManagedSessions(filePath: string, managedConversations: Set<string>, logger: StudioLogger): Promise<void> {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (typeof id === "string" && id.trim()) {
          managedConversations.add(id.trim());
        }
      }
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      logger.debug(`Failed to load managed Antigravity sessions from ${filePath}: ${describeError(error)}`, {
        step: "antigravity_sessions_load",
        filePath,
      });
    }
  }
}

export async function saveManagedSessions(filePath: string, managedConversations: Set<string>, logger: StudioLogger): Promise<void> {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify([...managedConversations], null, 2)}\n`, "utf8");
  } catch (error) {
    logger.debug(`Failed to save managed Antigravity sessions to ${filePath}: ${describeError(error)}`, {
      step: "antigravity_sessions_save",
      filePath,
    });
  }
}

export async function deleteCascadeTrajectoryRpc(
  session: ActiveSessionInfo,
  conversationId: string,
  logger: StudioLogger,
): Promise<boolean> {
  try {
    if (session.address && session.csrfToken) {
      const port = session.address.replace(/^localhost:/, "").replace(/^127\.0\.0\.1:/, "");
      const res = await fetch(`http://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/DeleteCascadeTrajectory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-codeium-csrf-token": session.csrfToken,
        },
        body: JSON.stringify({ cascadeId: conversationId }),
        signal: AbortSignal.timeout(4000),
      });
      return res.ok;
    }
  } catch (error) {
    logger.debug(`DeleteCascadeTrajectory RPC failed for ${conversationId}: ${error instanceof Error ? error.message : "unknown error"}`, {
      step: "antigravity_rpc_delete",
    });
  }
  return false;
}

export async function removePathIfPresent(
  filePath: string,
  operation: string,
  context: { conversationId?: string; threadId?: string },
  recursive = false,
  logger?: StudioLogger,
): Promise<void> {
  try {
    await rm(filePath, { force: true, recursive });
  } catch (error) {
    if (isNotFoundError(error)) return;
    logger?.debug(`Failed to ${operation} at ${filePath}: ${describeError(error)}`, {
      step: "antigravity_cleanup",
      filePath,
      ...context,
    });
  }
}

export async function removeConversationArtifacts(
  baseDir: string,
  conversationId: string,
  threadId?: string,
  logger?: StudioLogger,
): Promise<void> {
  const convDir = path.join(baseDir, "conversations");
  for (const extension of [".db", ".db-wal", ".db-shm"]) {
    const filePath = path.join(convDir, `${conversationId}${extension}`);
    await removePathIfPresent(filePath, `remove conversation database${extension}`, { conversationId, threadId }, false, logger);
  }
  await removePathIfPresent(
    path.join(baseDir, "brain", conversationId),
    "remove brain artifacts",
    { conversationId, threadId },
    true,
    logger,
  );
  await removePathIfPresent(
    path.join(baseDir, "annotations", conversationId),
    "remove annotations",
    { conversationId, threadId },
    true,
    logger,
  );
  await removePathIfPresent(
    path.join(baseDir, "context_state", `${conversationId}.pb`),
    "remove context state",
    {
      conversationId,
      threadId,
    },
    false,
    logger,
  );
}

export async function isStudioTaskConversation(
  convId: string,
  threadConversations: Map<string, string>,
  managedConversations: Set<string>,
  logger: StudioLogger,
): Promise<boolean> {
  const currentConvId = process.env.ANTIGRAVITY_CONVERSATION_ID?.trim();
  if (currentConvId && convId === currentConvId) return false;
  if (threadConversations.has(convId) || Array.from(threadConversations.values()).includes(convId)) {
    return false;
  }

  if (managedConversations.has(convId)) return true;

  const baseDir = getAntigravityBaseDir();
  const dbPath = path.join(baseDir, "conversations", `${convId}.db`);
  try {
    const buf = await readFile(dbPath);
    const str = buf.toString("latin1");

    const studioSignatures = [
      /Task type:\s*GENERATE_/i,
      /Task type:\s*SUGGEST_TOPICS/i,
      /You are an AI illustrator\.\s*Call the generate_image tool immediately/i,
      /Please read the complete task instructions and context from file:[^ \n\r]+\.context[\\\/]task_prompt_/i,
      /task_prompt_agy_thread_/i,
      /# Treatment\b/i,
      /# Episode Visual Bible\b/i,
      /# Research Dossier\b/i,
    ];

    return studioSignatures.some((sig) => sig.test(str));
  } catch (error) {
    if (!isNotFoundError(error)) {
      logger.debug(`Failed to inspect Antigravity conversation ${convId} at ${dbPath}: ${describeError(error)}`, {
        step: "antigravity_conversation_inspect",
        conversationId: convId,
        filePath: dbPath,
      });
    }
    return false;
  }
}
