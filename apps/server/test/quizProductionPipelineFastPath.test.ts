import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuizV2, Scene, Task } from "@studio/shared";
import { runPipelineTask } from "../src/tasks/pipeline/quizProductionPipelineRunner.js";
import type { PipelineRun, TaskManagerRuntime } from "../src/tasks/runtime.js";

vi.mock("../src/tasks/pipeline/quizV2PipelineRunner.js", () => ({
  runQuizV2Pipeline: vi.fn(async () => {}),
}));

const mockQuiz: QuizV2 = {
  schema_version: 2,
  episode_id: "ep_fastpath",
  topic: "Dinosaurs",
  age_band: "7-9",
  language: "en",
  format: "multiple_choice",
  questions: [
    {
      question_number: 1,
      question: "Which dinosaur had three horns?",
      choices: ["T-Rex", "Triceratops", "Stegosaurus"],
      correct_choice_index: 1,
      correct_answer: "Triceratops",
      explanation: "Tri means three!",
      image_prompt: "A friendly triceratops with three horns in a lush prehistoric forest",
    },
  ],
};

const mockScene: Scene = {
  scene_id: "scene_1",
  episode_id: "ep_fastpath",
  scene_number: 1,
  duration_seconds: 5,
  dialogue: "Which dinosaur had three horns? Triceratops!",
  visual_prompt: "A friendly triceratops",
  transition_note: "",
  continuity_note: "",
  sequence_id: "seq_1",
  sequence_title: "Question 1",
  shot_id: "shot_1",
  asset_type: "ai_reconstruction",
  continuity_bundle_id: "CB-01",
  reference_asset_ids: [],
  source_ids: ["Q1"],
  reconstruction: true,
  sound_cue: "",
  editorial_overlay: { kind: "none", text: "", motion: "none", placement: "lower_third", duration_seconds: null, data: [], source_ids: [] },
  quiz: {
    phase: "question",
    question_number: 1,
    question: "Which dinosaur had three horns?",
    choices: ["T-Rex", "Triceratops", "Stegosaurus"],
    answer: "Triceratops",
    explanation: "Tri means three!",
    image_prompt: "A friendly triceratops",
  },
  audio_asset_path: null,
  audio_generated_at: null,
  audio_duration_seconds: null,
};

describe("Quiz Production Pipeline Fast-Path Integration", () => {
  let submittedTypes: string[] = [];
  let updatedStates: Array<{ progress_message?: string; progress_percent?: number }> = [];
  let finishedStatus: string | null = null;
  let savedScenes: Scene[] = [];
  let mockQuizOnDisk: QuizV2 | null = null;

  beforeEach(() => {
    submittedTypes = [];
    updatedStates = [];
    finishedStatus = null;
    savedScenes = [];
    mockQuizOnDisk = null;
    delete process.env.USE_LEGACY_QUIZ_PIPELINE;
  });

  afterEach(() => {
    delete process.env.USE_LEGACY_QUIZ_PIPELINE;
  });

  function createMockRuntime(overrides: Partial<Record<string, any>> = {}) {
    const pipelineRuns = new Map<string, PipelineRun>();

    const runtime = {
      pipelineRuns,
      submit: vi.fn((type: string) => {
        submittedTypes.push(type);
        if (type === "GENERATE_QUIZ") {
          mockQuizOnDisk = mockQuiz;
        }
        return { task_id: `task_${type}_${Date.now()}` };
      }),
      get: vi.fn((id: string) => ({
        task_id: id,
        status: "COMPLETED",
        progress_message: "Finished",
        progress_percent: 100,
        render_progress: null,
      })),
      update: vi.fn(async (_id: string, fields: any) => {
        updatedStates.push(fields);
      }),
      finish: vi.fn(async (_id: string, status: string) => {
        finishedStatus = status;
      }),
      repository: {
        readQuiz: vi.fn(async () => mockQuizOnDisk),
        readScenes: vi.fn(async () => (savedScenes.length > 0 ? savedScenes : [mockScene])),
        saveScenes: vi.fn(async (_ch: string, _ep: string, scenes: Scene[]) => {
          savedScenes = scenes;
        }),
        getEpisodeFile: vi.fn(async () => ({ content: "generation has not started", modified_at: new Date().toISOString() })),
        backupEpisodeFile: vi.fn(async () => {}),
        readSequenceDrafts: vi.fn(async () => []),
        clearSequenceDrafts: vi.fn(async () => {}),
        commitSequenceDrafts: vi.fn(async () => true),
      },
      ...overrides,
    } as unknown as TaskManagerRuntime;

    return runtime;
  }

  it("triggers GENERATE_QUIZ and bypasses legacy narrative LLM tasks when quiz.json is absent", async () => {
    mockQuizOnDisk = null;
    const runtime = createMockRuntime();

    const task: Task = {
      task_id: "pipeline_task_1",
      task_type: "PRODUCE_EPISODE",
      channel_id: "ch_1",
      episode_id: "ep_fastpath",
      status: "QUEUED",
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      error: null,
      output_files: [],
      progress_message: null,
      progress_percent: null,
      render_progress: null,
      queue_position: null,
      scene_number: null,
      lock_key: "lock_1",
      accumulated_duration_seconds: 0,
      codex_thread_id: null,
      codex_turn_id: null,
    };

    await runPipelineTask.call(runtime, task);

    expect(submittedTypes).toContain("GENERATE_QUIZ");
    expect(submittedTypes).toContain("GENERATE_VIDEO");
    expect(submittedTypes).not.toContain("GENERATE_RESEARCH");
    expect(submittedTypes).not.toContain("GENERATE_TREATMENT");
    expect(submittedTypes).not.toContain("GENERATE_SCRIPT");
    expect(submittedTypes).not.toContain("GENERATE_VISUAL_BIBLE");
    expect(submittedTypes).not.toContain("GENERATE_SEQUENCE_SCENES");
    expect(finishedStatus).toBe("COMPLETED");
  });

  it("skips GENERATE_QUIZ completely when quiz.json is already present", async () => {
    mockQuizOnDisk = mockQuiz;
    const runtime = createMockRuntime();

    const task: Task = {
      task_id: "pipeline_task_2",
      task_type: "PRODUCE_EPISODE",
      channel_id: "ch_1",
      episode_id: "ep_fastpath",
      status: "QUEUED",
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      error: null,
      output_files: [],
      progress_message: null,
      progress_percent: null,
      render_progress: null,
      queue_position: null,
      scene_number: null,
      lock_key: "lock_2",
      accumulated_duration_seconds: 0,
      codex_thread_id: null,
      codex_turn_id: null,
    };

    await runPipelineTask.call(runtime, task);

    expect(submittedTypes).not.toContain("GENERATE_QUIZ");
    expect(submittedTypes).toContain("GENERATE_VIDEO");
    expect(submittedTypes).not.toContain("GENERATE_RESEARCH");
    expect(finishedStatus).toBe("COMPLETED");
    expect(updatedStates.some((s) => s.progress_message === "Quiz · questions already ready")).toBe(true);
  });

  it("falls back to legacy multi-step pipeline when USE_LEGACY_QUIZ_PIPELINE is true", async () => {
    process.env.USE_LEGACY_QUIZ_PIPELINE = "true";
    const runtime = createMockRuntime();

    const task: Task = {
      task_id: "pipeline_task_3",
      task_type: "PRODUCE_EPISODE",
      channel_id: "ch_1",
      episode_id: "ep_fastpath",
      status: "QUEUED",
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      error: null,
      output_files: [],
      progress_message: null,
      progress_percent: null,
      render_progress: null,
      queue_position: null,
      scene_number: null,
      lock_key: "lock_3",
      accumulated_duration_seconds: 0,
      codex_thread_id: null,
      codex_turn_id: null,
    };

    await runPipelineTask.call(runtime, task);

    expect(submittedTypes).toContain("GENERATE_RESEARCH");
    expect(submittedTypes).not.toContain("GENERATE_QUIZ");
  });

  it("handles missing episode_id error cleanly", async () => {
    const runtime = createMockRuntime();
    const task: Task = {
      task_id: "pipeline_task_4",
      task_type: "PRODUCE_EPISODE",
      channel_id: "ch_1",
      episode_id: null,
      status: "QUEUED",
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      error: null,
      output_files: [],
      progress_message: null,
      progress_percent: null,
      render_progress: null,
      queue_position: null,
      scene_number: null,
      lock_key: "lock_4",
      accumulated_duration_seconds: 0,
      codex_thread_id: null,
      codex_turn_id: null,
    };

    await runPipelineTask.call(runtime, task);
    expect(finishedStatus).toBe("FAILED");
  });

  it("rebalances scenes overlays after fast-path quiz generation", async () => {
    mockQuizOnDisk = null;
    let savedScenesList: Scene[] = [];
    const runtime = createMockRuntime({
      submit: vi.fn((type: string) => {
        submittedTypes.push(type);
        if (type === "GENERATE_QUIZ") {
          mockQuizOnDisk = mockQuiz;
          savedScenesList = [mockScene];
        }
        return { task_id: `task_${type}_${Date.now()}` };
      }),
      repository: {
        readQuiz: vi.fn(async () => mockQuizOnDisk),
        readScenes: vi.fn(async () => savedScenesList),
        saveScenes: vi.fn(async (_ch: string, _ep: string, scenes: Scene[]) => {
          savedScenesList = scenes;
        }),
      },
    });

    const task: Task = {
      task_id: "pipeline_task_5",
      task_type: "PRODUCE_EPISODE",
      channel_id: "ch_1",
      episode_id: "ep_fastpath",
      status: "QUEUED",
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      error: null,
      output_files: [],
      progress_message: null,
      progress_percent: null,
      render_progress: null,
      queue_position: null,
      scene_number: null,
      lock_key: "lock_5",
      accumulated_duration_seconds: 0,
      codex_thread_id: null,
      codex_turn_id: null,
    };

    await runPipelineTask.call(runtime, task);

    expect(submittedTypes).toContain("GENERATE_QUIZ");
    expect(savedScenesList.length).toBe(1);
    expect(finishedStatus).toBe("COMPLETED");
  });
});
