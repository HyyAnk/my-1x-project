import { access, constants, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { StudioLogger } from "../logger.js";
import { describeError, type TranscriptStep } from "./types.js";

export type TranscriptWatcherCallbacks = {
  onDelta: (delta: string) => void;
  onCompleted: (status: "completed" | "interrupted" | "failed", error?: string) => void;
  logger: StudioLogger;
};

export async function watchTranscriptStream(
  conversationId: string,
  threadId: string,
  turnId: string,
  controller: AbortController,
  cb: TranscriptWatcherCallbacks,
): Promise<void> {
  const userHome = homedir();
  const baseDir = path.join(userHome, ".gemini", "antigravity", "brain", conversationId, ".system_generated", "logs");
  const transcriptFullPath = path.join(baseDir, "transcript_full.jsonl");
  const transcriptPath = path.join(baseDir, "transcript.jsonl");

  const startTime = Date.now();
  let lastActivityTime = Date.now();
  const maxWaitMs = 1_800_000;
  const maxIdleWaitMs = 1_200_000;
  let lastSeenLineCount = 0;
  let lastDelivered = "";
  let isDone = false;
  let streamInterrupted = false;
  let streamInterruptedAt = 0;

  while (Date.now() - startTime < maxWaitMs) {
    if (Date.now() - lastActivityTime > maxIdleWaitMs) {
      throw new Error("Antigravity turn timed out due to 20 minutes of inactivity from IDE session");
    }

    if (controller.signal.aborted) {
      cb.onCompleted("interrupted");
      return;
    }

    try {
      const fullExists = await access(transcriptFullPath, constants.R_OK)
        .then(() => true)
        .catch(() => false);
      const normExists =
        !fullExists &&
        (await access(transcriptPath, constants.R_OK)
          .then(() => true)
          .catch(() => false));
      const filePath = fullExists ? transcriptFullPath : normExists ? transcriptPath : null;

      if (filePath) {
        const raw = await readFile(filePath, "utf8");
        const lines = raw.split(/\r?\n/).filter(Boolean);
        if (lines.length > lastSeenLineCount) {
          lastSeenLineCount = lines.length;
          lastActivityTime = Date.now();
        }
        for (const line of lines) {
          try {
            const step = JSON.parse(line) as TranscriptStep;

            if (step.type === "ERROR_MESSAGE" && typeof step.content === "string" && step.content.includes("stream was interrupted")) {
              if (!streamInterrupted) {
                streamInterrupted = true;
                streamInterruptedAt = Date.now();
              }
            } else if (step.source === "MODEL" || (step.tool_calls && step.tool_calls.length > 0)) {
              streamInterrupted = false;
            }

            const isModel = step.source === "MODEL";
            const isPlanner = step.type === "PLANNER_RESPONSE";
            const hasNoToolCalls = !step.tool_calls || step.tool_calls.length === 0;
            const isTruncated = Boolean(step.is_truncated || (typeof step.content === "string" && step.content.includes("<truncated ")));
            let currentContent = typeof step.content === "string" ? step.content : "";

            if (!currentContent.trim() && step.tool_calls && Array.isArray(step.tool_calls)) {
              for (const call of step.tool_calls) {
                if (call.name === "write_to_file" && call.args?.CodeContent) {
                  currentContent = call.args.CodeContent;
                } else if (call.name === "replace_file_content" && call.args?.ReplacementContent) {
                  currentContent = call.args.ReplacementContent;
                }
              }
            }

            if (isModel && isPlanner && (hasNoToolCalls || currentContent.trim()) && currentContent.trim()) {
              if (!isTruncated) {
                if (currentContent.length > lastDelivered.length) {
                  const delta = currentContent.slice(lastDelivered.length);
                  lastDelivered = currentContent;
                  cb.onDelta(delta);
                }
                if (step.status === "DONE" && lastDelivered.trim()) {
                  isDone = true;
                }
              }
            }
          } catch (error) {
            cb.logger.debug(
              `Skipped partial Antigravity transcript line for conversation ${conversationId} from ${filePath}: ${describeError(error)}`,
              { step: "antigravity_stream_parse", conversationId, threadId, filePath },
            );
          }
        }
      }
      if (isDone) break;

      if (
        streamInterrupted &&
        Date.now() - streamInterruptedAt > 60_000 &&
        Date.now() - lastActivityTime > 30_000 &&
        !lastDelivered.trim()
      ) {
        throw new Error("Antigravity IDE session stream was interrupted and remained inactive for 60s.");
      }
    } catch (watchErr) {
      if (watchErr instanceof Error && watchErr.message.includes("remained inactive")) {
        throw watchErr;
      }
      cb.logger.debug(`Antigravity transcript poll is waiting for conversation ${conversationId}: ${describeError(watchErr)}`, {
        step: "antigravity_stream_poll",
        conversationId,
        threadId,
        filePath: transcriptFullPath,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Final verification pass
  try {
    if (
      await access(transcriptFullPath, constants.R_OK)
        .then(() => true)
        .catch(() => false)
    ) {
      const rawFull = await readFile(transcriptFullPath, "utf8");
      const fullLines = rawFull.split(/\r?\n/).filter(Boolean);
      for (const line of fullLines) {
        try {
          const step = JSON.parse(line) as TranscriptStep;
          const isModel = step.source === "MODEL";
          const isPlanner = step.type === "PLANNER_RESPONSE";
          const hasNoToolCalls = !step.tool_calls || step.tool_calls.length === 0;
          let fullContent = typeof step.content === "string" ? step.content : "";
          if (!fullContent.trim() && step.tool_calls && Array.isArray(step.tool_calls)) {
            for (const call of step.tool_calls) {
              if (call.name === "write_to_file" && call.args?.CodeContent) {
                fullContent = call.args.CodeContent;
              } else if (call.name === "replace_file_content" && call.args?.ReplacementContent) {
                fullContent = call.args.ReplacementContent;
              }
            }
          }
          if (isModel && isPlanner && (hasNoToolCalls || fullContent.trim()) && fullContent.trim()) {
            if (fullContent.length > lastDelivered.length) {
              const delta = fullContent.slice(lastDelivered.length);
              lastDelivered = fullContent;
              cb.onDelta(delta);
            }
            if (step.status === "DONE") {
              isDone = true;
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  if (!isDone && !lastDelivered) {
    throw new Error("Antigravity turn timed out waiting for response from active IDE session");
  }

  cb.onCompleted("completed");
}
