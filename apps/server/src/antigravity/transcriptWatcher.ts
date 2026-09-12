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

interface WatcherStreamState {
  lastDelivered: string;
  isDone: boolean;
  streamInterrupted: boolean;
  streamInterruptedAt: number;
}

async function resolveTranscriptFilePath(fullPath: string, normalPath: string): Promise<string | null> {
  const fullExists = await access(fullPath, constants.R_OK)
    .then(() => true)
    .catch(() => false);
  if (fullExists) return fullPath;

  const normExists = await access(normalPath, constants.R_OK)
    .then(() => true)
    .catch(() => false);
  return normExists ? normalPath : null;
}

function extractStepContent(step: TranscriptStep): string {
  let content = typeof step.content === "string" ? step.content : "";
  if (!content.trim() && Array.isArray(step.tool_calls)) {
    for (const call of step.tool_calls) {
      if (call.name === "write_to_file" && call.args?.CodeContent) {
        content = call.args.CodeContent;
      } else if (call.name === "replace_file_content" && call.args?.ReplacementContent) {
        content = call.args.ReplacementContent;
      }
    }
  }
  return content;
}

function isStepTruncated(step: TranscriptStep): boolean {
  return Boolean(step.is_truncated || (typeof step.content === "string" && step.content.includes("<truncated ")));
}

function updateInterruptedStatus(step: TranscriptStep, state: WatcherStreamState): void {
  if (step.type === "ERROR_MESSAGE" && typeof step.content === "string" && step.content.includes("stream was interrupted")) {
    if (!state.streamInterrupted) {
      state.streamInterrupted = true;
      state.streamInterruptedAt = Date.now();
    }
  } else if (step.source === "MODEL" || (step.tool_calls && step.tool_calls.length > 0)) {
    state.streamInterrupted = false;
  }
}

function processStepContentDelta(
  step: TranscriptStep,
  state: WatcherStreamState,
  cb: TranscriptWatcherCallbacks,
  allowTruncated = false,
): void {
  const isModel = step.source === "MODEL";
  const isPlanner = step.type === "PLANNER_RESPONSE";
  const hasNoToolCalls = !step.tool_calls || step.tool_calls.length === 0;
  const currentContent = extractStepContent(step);
  const trimmed = currentContent.trim();

  if (isModel && isPlanner && (hasNoToolCalls || trimmed) && trimmed) {
    if (allowTruncated || !isStepTruncated(step)) {
      if (currentContent.length > state.lastDelivered.length) {
        const delta = currentContent.slice(state.lastDelivered.length);
        state.lastDelivered = currentContent;
        cb.onDelta(delta);
      }
      if (step.status === "DONE" && state.lastDelivered.trim()) {
        state.isDone = true;
      }
    }
  }
}

function processTranscriptLine(
  line: string,
  state: WatcherStreamState,
  cb: TranscriptWatcherCallbacks,
  context: { conversationId: string; threadId: string; filePath: string },
): void {
  try {
    const step = JSON.parse(line) as TranscriptStep;
    updateInterruptedStatus(step, state);
    processStepContentDelta(step, state, cb, false);
  } catch (error) {
    cb.logger.debug(
      `Skipped partial Antigravity transcript line for conversation ${context.conversationId} from ${context.filePath}: ${describeError(error)}`,
      { step: "antigravity_stream_parse", conversationId: context.conversationId, threadId: context.threadId, filePath: context.filePath },
    );
  }
}

function checkStreamInterruptedTimeout(state: WatcherStreamState, lastActivityTime: number): void {
  if (
    state.streamInterrupted &&
    Date.now() - state.streamInterruptedAt > 60_000 &&
    Date.now() - lastActivityTime > 30_000 &&
    !state.lastDelivered.trim()
  ) {
    throw new Error("Antigravity IDE session stream was interrupted and remained inactive for 60s.");
  }
}

async function runFinalVerificationPass(
  transcriptFullPath: string,
  state: WatcherStreamState,
  cb: TranscriptWatcherCallbacks,
): Promise<void> {
  try {
    const fullExists = await access(transcriptFullPath, constants.R_OK)
      .then(() => true)
      .catch(() => false);
    if (!fullExists) return;

    const rawFull = await readFile(transcriptFullPath, "utf8");
    const fullLines = rawFull.split(/\r?\n/).filter(Boolean);
    for (const line of fullLines) {
      try {
        const step = JSON.parse(line) as TranscriptStep;
        processStepContentDelta(step, state, cb, true);
      } catch {
        // ignore partial lines on final verification pass
      }
    }
  } catch {
    // ignore filesystem errors on final verification pass
  }
}

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

  const state: WatcherStreamState = {
    lastDelivered: "",
    isDone: false,
    streamInterrupted: false,
    streamInterruptedAt: 0,
  };

  while (Date.now() - startTime < maxWaitMs) {
    if (Date.now() - lastActivityTime > maxIdleWaitMs) {
      throw new Error("Antigravity turn timed out due to 20 minutes of inactivity from IDE session");
    }

    if (controller.signal.aborted) {
      cb.onCompleted("interrupted");
      return;
    }

    try {
      const filePath = await resolveTranscriptFilePath(transcriptFullPath, transcriptPath);
      if (filePath) {
        const raw = await readFile(filePath, "utf8");
        const lines = raw.split(/\r?\n/).filter(Boolean);
        if (lines.length > lastSeenLineCount) {
          lastSeenLineCount = lines.length;
          lastActivityTime = Date.now();
        }
        for (const line of lines) {
          processTranscriptLine(line, state, cb, { conversationId, threadId, filePath });
        }
      }
      if (state.isDone) break;

      checkStreamInterruptedTimeout(state, lastActivityTime);
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

  await runFinalVerificationPass(transcriptFullPath, state, cb);

  if (!state.isDone && !state.lastDelivered) {
    throw new Error("Antigravity turn timed out waiting for response from active IDE session");
  }

  cb.onCompleted("completed");
}
