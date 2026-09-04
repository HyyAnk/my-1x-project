import { describe, expect, it, vi } from "vitest";
import type { Channel, Episode, QuizV2, Scene, Task } from "@studio/shared";
import { buildDirectQuizOutputContract } from "../src/context/quizDirectPromptBuilder.js";
import { handleDirectQuizOutput } from "../src/tasks/handlers/directQuizHandler.js";
import { synthesizeAllLegacyArtifacts } from "../src/quiz/domain/quizArtifactSynthesizer.js";
import { validateQuizScript, validateQuizVisualBible } from "../src/tasks/validators.js";
import { deriveQuizV2FromScenes } from "../src/quiz/domain/quiz.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizComposition } from "../src/tasks.js";
import { runPipelineTask } from "../src/tasks/pipeline/quizProductionPipelineRunner.js";
import type { ActiveRun, PipelineRun, TaskManagerRuntime } from "../src/tasks/runtime.js";

vi.mock("../src/tasks/pipeline/quizV2PipelineRunner.js", () => ({
  runQuizV2Pipeline: vi.fn(async () => {}),
}));

describe("Level 2 Architecture: End-to-End Quiz-Native Flow Verification", () => {
  const channel: Channel = {
    channel_id: "ch_e2e",
    name: "Ocean Explorers",
    slug: "ocean-explorers",
    language: "en",
    system_prompt: "",
    thumbnail_concept: "",
    default_rules: [],
    custom_rules: [],
    visual_style: "3D Pixar Animation",
    art_style: "pixar_3d",
    target_audience: "Kids 7-9",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const episode: Episode = {
    episode_id: "ep_e2e",
    channel_id: "ch_e2e",
    topic: {
      title: "Ocean Giants: The Blue Whale",
      core_premise: "Discovering the largest animal on Earth",
      hook: "Did you know a blue whale's tongue weighs as much as an elephant?",
    },
    status: "DRAFT",
    stage: "PLANNED",
    target_duration_minutes: 2,
    quiz_config: {
      question_count: 2,
      quiz_format: "multiple_choice",
      age_band: "7-9",
      visual_theme: "candy_pop",
      resolved_visual_style: "pixar_3d",
      thinking_bar_style: "ember_trail",
      question_box_style: "neon_pulse",
      answer_card_style: "solid_white",
      counter_style: "pill",
      background_style: "aurora_glow",
      palette_id: "ocean_breeze",
      thumbnail_ratio: "16:9",
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    narration_asset_path: null,
    video_asset_path: null,
  };

  const mockLLMQuizOutput: QuizV2 = {
    schema_version: 2,
    episode_id: "ep_e2e",
    age_band: "7-9",
    language: "en",
    questions: [
      {
        id: "question-01",
        number: 1,
        format: "multiple_choice",
        difficulty: 1,
        question: "How heavy can a blue whale's tongue be?",
        choices: [
          { id: "choice-a", text: "As heavy as a car" },
          { id: "choice-b", text: "As heavy as an elephant" },
          { id: "choice-c", text: "As heavy as a dog" },
        ],
        correct_choice_id: "choice-b",
        explanation: "A blue whale's tongue can weigh as much as an entire adult elephant!",
        fun_fact: "It weighs about 2.7 metric tons!",
        source_ids: ["C01"],
        visual_opportunity: "A massive, friendly blue whale swimming in crystal blue ocean water, warm sunlight rays, 3D Pixar animation style",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
      {
        id: "question-02",
        number: 2,
        format: "multiple_choice",
        difficulty: 2,
        question: "What is the main food that blue whales eat?",
        choices: [
          { id: "choice-a", text: "Tiny krill" },
          { id: "choice-b", text: "Giant squid" },
          { id: "choice-c", text: "Seaweed salad" },
        ],
        correct_choice_id: "choice-a",
        explanation: "Despite their massive size, blue whales eat tiny shrimp-like krill!",
        fun_fact: "They can eat 4 tons of krill per day!",
        source_ids: ["C02"],
        visual_opportunity: "A cute swarm of glowing tiny krill swimming together in the deep sea, 3D Pixar animation style",
        validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
      },
    ],
  };

  it("Step 1: Direct prompt builder constructs a structured, cinematic-free prompt", () => {
    const contract = buildDirectQuizOutputContract({
      taskType: "GENERATE_QUIZ",
      episode,
      quizQuestionCount: 2,
      quizLastClaimId: "C02",
      quizSourceMinimum: 1,
    });

    expect(contract).toContain("Return ONLY a raw, valid JSON object matching QuizV2 schema");
    expect(contract).toContain('"schema_version": 2');
    expect(contract).toContain('"episode_id": "ep_e2e"');
    expect(contract).toContain('"age_band": "7-9"');
    expect(contract).toContain("strictly exactly 3 choices with ids 'choice-a', 'choice-b', and 'choice-c'");
    expect(contract).not.toContain("CAMERA:");
    expect(contract).not.toContain("ATMOSPHERE:");
    expect(contract).not.toContain("Safe motion");
  });

  it("Step 2 & 3: DirectQuizHandler parses, balances answers, writes quiz.json, and auto-synthesizes legacy artifacts", async () => {
    let savedQuiz: QuizV2 | null = null;
    let savedScript: string | null = null;
    let savedVisual: string | null = null;
    let savedScenes: Scene[] = [];
    let stageUpdated: string | null = null;

    const mockRepository = {
      getEpisode: vi.fn(async () => episode),
      getChannel: vi.fn(async () => channel),
      writeQuiz: vi.fn(async (_ch: string, _ep: string, quiz: QuizV2) => {
        savedQuiz = quiz;
        return "channels/ocean-explorers/episodes/ep_e2e/quiz.json";
      }),
      readQuestionHistory: vi.fn(async () => []),
      writeHistoryCheck: vi.fn(async () => "history_check.json"),
      invalidateQuizArtifacts: vi.fn(async () => []),
      saveEpisodeFile: vi.fn(async (_ch: string, _ep: string, filename: string, content: string) => {
        if (filename === "script.md") savedScript = content;
        if (filename === "visual_bible.md") savedVisual = content;
        return { path: filename, modified_at: new Date().toISOString() };
      }),
      saveScenes: vi.fn(async (_ch: string, _ep: string, scenes: Scene[]) => {
        savedScenes = scenes;
      }),
      updateEpisodeStage: vi.fn(async (_ch: string, _ep: string, stage: string) => {
        stageUpdated = stage;
      }),
    };

    const mockRuntime = {
      repository: mockRepository,
    } as unknown as TaskManagerRuntime;

    const activeRun: ActiveRun = {
      task: {
        task_id: "task_quiz_e2e",
        task_type: "GENERATE_QUIZ",
        channel_id: "ch_e2e",
        episode_id: "ep_e2e",
        status: "RUNNING",
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        error: null,
        output_files: [],
        progress_message: null,
        progress_percent: null,
        render_progress: null,
        queue_position: null,
        scene_number: null,
        lock_key: "lock_e2e",
        accumulated_duration_seconds: 0,
        codex_thread_id: null,
        codex_turn_id: null,
      },
      process: null,
      scriptAttempts: 0,
      visualAttempts: 0,
      turnCount: 0,
      outputBuffer: "",
      totalDurationSeconds: 0,
      lastStatusUpdateAt: 0,
    };

    const rawOutput = JSON.stringify(mockLLMQuizOutput);
    const result = await handleDirectQuizOutput(mockRuntime, activeRun, `\`\`\`json\n${rawOutput}\n\`\`\``);

    expect(result).toContain("channels/ocean-explorers/episodes/ep_e2e/quiz.json");
    expect(savedQuiz).not.toBeNull();
    expect(savedQuiz!.questions).toHaveLength(2);
    expect(stageUpdated).toBe("QUIZ_READY");

    // Verify auto-synthesized artifacts satisfy all validators
    expect(savedScript).not.toBeNull();
    validateQuizScript(savedScript!, 2);

    expect(savedVisual).not.toBeNull();
    validateQuizVisualBible(savedVisual!, [1, 2]);

    expect(savedScenes).toHaveLength(2); // 1 scene per question
    const derivedRoundTrip = deriveQuizV2FromScenes({
      episodeId: "ep_e2e",
      language: "en",
      ageBand: "7-9",
      format: "multiple_choice",
      scenes: savedScenes,
    });
    expect(derivedRoundTrip.questions).toHaveLength(2);
    expect(derivedRoundTrip.questions[0].question).toBe(savedQuiz!.questions[0].question);
  });

  it("Step 4: Fast-Path pipeline runner skips legacy tasks and completes video composition pipeline", async () => {
    const synthesized = synthesizeAllLegacyArtifacts(mockLLMQuizOutput);
    const submittedTasks: string[] = [];
    let pipelineCompleted = false;

    const runtime = {
      pipelineRuns: new Map<string, PipelineRun>(),
      submit: vi.fn((type: string) => {
        submittedTasks.push(type);
        return { task_id: `task_${type}` };
      }),
      get: vi.fn((id: string) => ({
        task_id: id,
        status: "COMPLETED",
        progress_message: "Done",
        progress_percent: 100,
        render_progress: null,
      })),
      update: vi.fn(async () => {}),
      finish: vi.fn(async (_id: string, status: string) => {
        if (status === "COMPLETED") pipelineCompleted = true;
      }),
      repository: {
        readQuiz: vi.fn(async () => mockLLMQuizOutput),
        readScenes: vi.fn(async () => synthesized.scenes),
        saveScenes: vi.fn(async () => {}),
      },
    } as unknown as TaskManagerRuntime;

    const task: Task = {
      task_id: "pipeline_e2e",
      task_type: "PRODUCE_EPISODE",
      channel_id: "ch_e2e",
      episode_id: "ep_e2e",
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
      lock_key: "lock_pipe",
      accumulated_duration_seconds: 0,
      codex_thread_id: null,
      codex_turn_id: null,
    };

    await runPipelineTask.call(runtime, task);

    expect(pipelineCompleted).toBe(true);
    expect(submittedTasks).toContain("GENERATE_VIDEO");
    expect(submittedTasks).not.toContain("GENERATE_RESEARCH");
    expect(submittedTasks).not.toContain("GENERATE_TREATMENT");
    expect(submittedTasks).not.toContain("GENERATE_SCRIPT");
    expect(submittedTasks).not.toContain("GENERATE_VISUAL_BIBLE");
    expect(submittedTasks).not.toContain("GENERATE_SEQUENCE_SCENES");
  });

  it("Step 5: Full downstream stages (Director, AssetPlan, VoicePlan, Timeline, Composition) assemble cleanly", () => {
    const synthesized = synthesizeAllLegacyArtifacts(mockLLMQuizOutput);

    // 1. Director Plan (Pure TS, 1ms)
    const directorPlan = createDefaultDirectorPlan(mockLLMQuizOutput);
    expect(directorPlan.beats).toHaveLength(2);

    // 2. Asset Plan (Pure TS, 1ms)
    const assetPlan = planQuizAssets(mockLLMQuizOutput, directorPlan);
    expect(assetPlan.assets.length).toBeGreaterThanOrEqual(2);

    // 3. Voice Plan (Pure TS, 1ms)
    const voicePlan = buildQuizVoicePlan(mockLLMQuizOutput);
    expect(voicePlan.segments.length).toBeGreaterThanOrEqual(2);

    // 4. Timeline (Pure TS, 1ms)
    const timeline = compileQuizTimeline({
      quiz: mockLLMQuizOutput,
      director: directorPlan,
      voicePlan,
    });
    expect(timeline.duration_seconds).toBeGreaterThan(0);
    expect(timeline.events.length).toBeGreaterThanOrEqual(2);

    // 5. Final Candy Arcade Composition
    const compositionHtml = buildQuizComposition(
      episode.quiz_config,
      synthesized.scenes,
      "./audio/narration.wav",
      timeline.duration_seconds,
    );

    expect(compositionHtml).toContain("How heavy can a blue whale");
    expect(compositionHtml).toContain("As heavy as an elephant");
    expect(compositionHtml).toContain("data-duration=");
    expect(compositionHtml).toContain('id="quiz-narration"');
  });
});
