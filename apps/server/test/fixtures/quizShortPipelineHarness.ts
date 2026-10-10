import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { QuizShortSchema, quizShortProductRef, type QuizProductRef, type QuizShortLayoutPair, type Task } from "@studio/shared";
import { RepositoryService } from "../../src/repository.js";
import { StudioLogger } from "../../src/logger.js";
import { ContextEngine } from "../../src/context.js";
import { TaskManager } from "../../src/tasks.js";
import { createQuizShortId } from "../../src/repository/quizShorts.js";
import { runQuizV2Pipeline } from "../../src/tasks/pipeline/quizV2PipelineRunner.js";
import { buildTextQuizShortQuiz } from "./quizShortFixtures.js";

export const QUIZ_SHORT_TEXT_PAIR: QuizShortLayoutPair = { primary: "short_stack_list", secondary: "short_verdict_yes_no" };

/** A silent 48 kHz stereo PCM WAV of the requested length, enough for duration measurement. */
export function fakeWav(durationSeconds: number): Uint8Array {
  const sampleRate = 48000;
  const blockAlign = 4;
  const dataSize = Math.floor(durationSeconds * sampleRate) * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false);
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataSize, true);
  return new Uint8Array(buffer);
}

/** Narration stub: one second per 2.3 spoken words, never below the shortest measurable clip. */
export function fakeNarrationDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(0.6, Number((words / 2.3).toFixed(3)));
}

export type QuizShortPipelineHarness = {
  root: string;
  repository: RepositoryService;
  channelId: string;
  quizShortId: string;
  ref: QuizProductRef;
  task: Task;
  runPipeline: () => Promise<void>;
};

async function createRepositoryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "quiz-short-pipeline-"));
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");
  return root;
}

function buildPipelineTask(channelId: string, quizShortId: string): Task {
  const now = new Date().toISOString();
  return {
    task_id: "task-quiz-short-pipeline",
    task_type: "GENERATE_PIPELINE",
    channel_id: channelId,
    episode_id: quizShortId,
    product_kind: "quiz_short",
    status: "RUNNING",
    created_at: now,
    started_at: now,
    completed_at: null,
    codex_thread_id: null,
    codex_turn_id: null,
    error: null,
    output_files: [],
    lock_key: quizShortId,
    queue_position: null,
    progress_message: "Starting",
    scene_number: null,
  };
}

/** A channel with one Quiz Short (five text questions, alternating text layout pair) and a pipeline task for it. */
export async function createQuizShortPipelineHarness(): Promise<QuizShortPipelineHarness> {
  const root = await createRepositoryRoot();
  const repository = new RepositoryService(root);
  const logger = new StudioLogger(root);
  await logger.init();
  const channel = await repository.createChannel({
    name: "Shorts Pipeline Lab",
    description: "",
    target_audience: "",
    language: "English",
    market: "Global",
    dna_mode: "example",
  });
  const now = new Date().toISOString();
  const quizShort = await repository.saveQuizShort(
    channel.channel_id,
    QuizShortSchema.parse({
      quiz_short_id: createQuizShortId(),
      channel_id: channel.channel_id,
      slug: "planet-sprint",
      topic: { title: "Planet sprint", premise: "Five quick planet facts", hook: "Which planet wins?" },
      stage: "SCENE_READY",
      quiz_config: { question_count: 5, age_band: "7-9", layout_pair: QUIZ_SHORT_TEXT_PAIR },
      created_at: now,
      updated_at: now,
    }),
  );
  const ref = quizShortProductRef(channel.channel_id, quizShort.quiz_short_id);
  await repository.writeQuiz(channel.channel_id, ref, { ...buildTextQuizShortQuiz(), episode_id: quizShort.quiz_short_id });

  const taskManager = new TaskManager(repository, new ContextEngine(repository, logger), new EventEmitter() as never, 1, 8, logger);
  await taskManager.load();
  const task = buildPipelineTask(channel.channel_id, quizShort.quiz_short_id);
  (taskManager as unknown as { tasks: Map<string, Task> }).tasks.set(task.task_id, task);
  vi.spyOn(taskManager, "update").mockResolvedValue(task);

  return {
    root,
    repository,
    channelId: channel.channel_id,
    quizShortId: quizShort.quiz_short_id,
    ref,
    task,
    runPipeline: () => runQuizV2Pipeline.call(taskManager, task),
  };
}
