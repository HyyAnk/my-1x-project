import { expect } from "@playwright/test";

import { assessment, smokeTest } from "./helpers/smokeFixtures";

smokeTest("channel detail keeps topic generation progress visible", async ({ page }) => {
  const channel = {
    channel_id: "ch_demo",
    slug: "demo",
    display_name: "Demo channel",
    description: "A demo channel",
    target_audience: "Viewers",
    language: "English",
    market: "Global",
    channel_dna_path: "channels/demo/channel_dna.md",
    style_guide_path: "channels/demo/style_guide.md",
    status: "ACTIVE",
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
    episode_count: 0,
  };
  const task = {
    task_id: "task_demo",
    task_type: "SUGGEST_TOPICS",
    channel_id: "ch_demo",
    episode_id: null,
    status: "RUNNING",
    created_at: "2026-08-16T00:00:00.000Z",
    started_at: "2026-08-16T00:00:05.000Z",
    completed_at: null,
    codex_thread_id: "thread_demo",
    codex_turn_id: "turn_demo",
    error: null,
    output_files: [],
    lock_key: "ch_demo",
    queue_position: null,
    progress_message: "Receiving output",
    scene_number: null,
  };
  await page.route("**/api/channels", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ channels: [channel] }) }),
  );
  await page.route("**/api/tasks", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ tasks: [task], codex_status: "connected" }) }),
  );
  await page.route(`**/api/channels/ch_demo/dna`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ content: "# Channel DNA\n", path: channel.channel_dna_path, modified_at: channel.updated_at }),
    }),
  );
  await page.route(`**/api/channels/ch_demo/topics`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ topics: [] }) }),
  );
  await page.route(`**/api/channels/ch_demo/episodes`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ episodes: [] }) }),
  );
  await page.goto("/#/channels");
  await expect(page.getByRole("button", { name: /Demo channel/ })).toBeVisible();
  await page.getByRole("button", { name: /Demo channel/ }).click();
  await page.getByRole("tab", { name: /Idea Lab & Topics/ }).click();
  await expect(page.getByText("Topic generation", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Topic generation progress" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generating…", exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  const mobileWidth = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(mobileWidth.scrollWidth).toBeLessThanOrEqual(mobileWidth.clientWidth);
});

smokeTest("topic confirmation sends the selected question count before episode generation", async ({ page }) => {
  const channel = {
    channel_id: "ch_topic_count",
    slug: "topic-count",
    display_name: "Topic count",
    description: "A quiz channel",
    target_audience: "Children",
    language: "English",
    market: "Global",
    channel_dna_path: "channels/topic-count/channel_dna.md",
    style_guide_path: null,
    status: "ACTIVE",
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
    episode_count: 0,
  };
  const topic = {
    topic_id: "topic_count_1",
    channel_id: channel.channel_id,
    title: "Animal explorers",
    premise: "A playful animal quiz",
    why_it_fits: "Fits young quiz fans",
    hook: "Can you name them all?",
    estimated_potential: "High",
    generated_at: channel.created_at,
    selected: false,
    quiz_format: "multiple_choice",
    question_count: 8,
    age_band: "7-9",
    run_id: "run_topic_count",
  };
  const episode = {
    episode_id: "ep_topic_count",
    channel_id: channel.channel_id,
    slug: "animal-explorers",
    topic: { title: topic.title, premise: topic.premise, hook: topic.hook },
    stage: "SELECTED",
    script_path: "channels/topic-count/episodes/animal-explorers/script.md",
    research_path: "channels/topic-count/episodes/animal-explorers/research.md",
    treatment_path: "channels/topic-count/episodes/animal-explorers/treatment.md",
    visual_bible_path: "channels/topic-count/episodes/animal-explorers/visual_bible.md",
    scene_plan_path: "channels/topic-count/episodes/animal-explorers/scene_plan.md",
    dialogue_script_path: "channels/topic-count/episodes/animal-explorers/dialogue_script.md",
    video_prompts_path: "channels/topic-count/episodes/animal-explorers/video_prompts.md",
    target_duration_minutes: 7,
    target_word_count: 918,
    narration_asset_path: null,
    narration_generated_at: null,
    narration_duration_seconds: null,
    narration_segment_count: 0,
    measured_narration_words_per_second: null,
    quiz_config: {
      question_count: 12,
      quiz_format: "multiple_choice",
      age_band: "7-9",
      answer_mode: "voice_and_reveal",
      visual_theme: "candy_pop",
    },
    video_asset_path: null,
    video_generated_at: null,
    video_duration_seconds: null,
    render_manifest_path: null,
    created_at: channel.created_at,
    updated_at: channel.updated_at,
  };
  let confirmedPayload: unknown = null;
  let releaseConfirmation: (() => void) | undefined;
  let episodes: Array<typeof episode> = [];

  await page.route("**/api/config", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        video_generation: {
          provider: "none",
          model: "",
          max_scene_duration_seconds: 8,
          default_scene_duration_seconds: 6,
          aspect_ratio: "16:9",
        },
        codex: {
          max_concurrent_tasks: 3,
          transport: "app_server",
          app_server_endpoint: "stdio://",
          command: "codex",
          model: "",
          experimental_api: false,
          api_base_url: "",
          api_key: "",
        },
        audio_generation: {
          provider: "chatterbox",
          service_url: "http://127.0.0.1:8890",
          exaggeration: 0.5,
          cfg_weight: 0.5,
          max_concurrent_tasks: 2,
        },
      }),
    }),
  );
  await page.route("**/api/channels", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ channels: [channel] }) }),
  );
  await page.route("**/api/tasks", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ tasks: [], codex_status: "connected" }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/dna`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ content: "# DNA", path: channel.channel_dna_path, modified_at: channel.updated_at }),
    }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/topics`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ topics: [topic] }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ episodes }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/topics/${topic.topic_id}/confirm`, async (route) => {
    confirmedPayload = route.request().postDataJSON();
    await new Promise<void>((resolve) => {
      releaseConfirmation = resolve;
    });
    episodes = [episode];
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ episode }) });
  });
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/file/*`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ content: "", path: "", modified_at: null }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/scenes`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ scenes: [] }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/production-assessment`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ assessment: null }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/visual-bible/images`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ images: [] }) }),
  );
  const mockQuizState = {
    quiz: null,
    director_plan: null,
    asset_plan: null,
    voice_plan: null,
    timeline: null,
    assessment: null,
    stages: {
      research: "not_started",
      questions: "not_started",
      director: "not_started",
      assets: "not_started",
      voice: "not_started",
      timeline: "not_started",
      qa: "not_started",
      render: "not_started",
    },
  };
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2/history-check`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ history_check: null }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/quiz-v2`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(mockQuizState) }),
  );

  await page.goto("/#/channels");
  await page.getByRole("button", { name: /Topic count/ }).click();
  await page.getByRole("tab", { name: /Idea Lab & Topics/ }).click();
  const topicCard = page.locator(".topic-card").filter({ hasText: topic.title });
  const questionPicker = topicCard.getByRole("spinbutton", { name: `Question count for ${topic.title}` });
  await expect(questionPicker).toHaveAttribute("min", "3");
  await expect(questionPicker).toHaveAttribute("max", "50");
  await questionPicker.fill("51");
  await expect(topicCard.getByRole("button", { name: "Select Topic", exact: true })).toBeDisabled();
  await expect(topicCard.getByText("Choose 3-50", { exact: true })).toBeVisible();
  await questionPicker.fill("12");
  await expect(questionPicker).toHaveValue("12");
  await expect(topicCard.getByText("About 7 min", { exact: true })).toBeVisible();

  const confirmButton = topicCard.getByRole("button", { name: "Select Topic", exact: true });
  await confirmButton.click();
  await expect(topicCard.getByRole("button", { name: "Selecting Topic…", exact: true })).toBeDisabled();
  await expect
    .poll(() => confirmedPayload)
    .toEqual({ topic_id: topic.topic_id, question_count: 12, visual_style: "mixed", auto_start_pipeline: false });
  releaseConfirmation?.();
  await expect(page.getByRole("status")).toContainText("with 12 questions");
  await page.locator(".breadcrumbs-nav").getByRole("link", { name: channel.display_name }).click();
  await expect(page.locator(".episode-card").filter({ hasText: topic.title })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileWidth = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(mobileWidth.scrollWidth).toBeLessThanOrEqual(mobileWidth.clientWidth);
});

smokeTest("confirmed episode runs script to scene to render without F5", async ({ page }) => {
  const channel = {
    channel_id: "ch_episode",
    slug: "episode-demo",
    display_name: "Episode demo",
    description: "A demo channel",
    target_audience: "Viewers",
    language: "English",
    market: "Global",
    channel_dna_path: "channels/episode-demo/channel_dna.md",
    style_guide_path: null,
    status: "ACTIVE",
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
    episode_count: 1,
  };
  const episode = {
    episode_id: "ep_demo",
    channel_id: channel.channel_id,
    slug: "the-demo-story",
    topic: { title: "The Demo Story", premise: "A story used to verify realtime updates.", hook: "What happens next?" },
    stage: "SCRIPT",
    script_path: "channels/episode-demo/episodes/the-demo-story/script.md",
    research_path: "channels/episode-demo/episodes/the-demo-story/research.md",
    treatment_path: "channels/episode-demo/episodes/the-demo-story/treatment.md",
    visual_bible_path: "channels/episode-demo/episodes/the-demo-story/visual_bible.md",
    scene_plan_path: "channels/episode-demo/episodes/the-demo-story/scene_plan.json",
    dialogue_script_path: "channels/episode-demo/episodes/the-demo-story/dialogue_script.md",
    video_prompts_path: "channels/episode-demo/episodes/the-demo-story/video_prompts.md",
    target_duration_minutes: 8,
    target_word_count: 1050,
    narration_asset_path: null,
    narration_generated_at: null,
    narration_duration_seconds: null,
    narration_segment_count: 0,
    measured_narration_words_per_second: null,
    video_asset_path: null as string | null,
    video_generated_at: null as string | null,
    video_duration_seconds: null as number | null,
    render_manifest_path: null as string | null,
    created_at: channel.created_at,
    updated_at: channel.updated_at,
  };
  let scriptContent = "Old script";
  let visualBibleContent = "# Visual Bible\n\nVisual development has not started.";
  let scenes: Array<Record<string, unknown>> = [];
  let submittedPipeline: Record<string, unknown> | null = null;
  let task = {
    task_id: "task_script",
    task_type: "GENERATE_SCRIPT",
    channel_id: channel.channel_id,
    episode_id: episode.episode_id,
    status: "RUNNING",
    created_at: "2026-08-16T00:00:00.000Z",
    started_at: "2026-08-16T00:00:05.000Z",
    completed_at: null as string | null,
    codex_thread_id: "thread_demo",
    codex_turn_id: "turn_demo",
    error: null,
    output_files: [] as string[],
    lock_key: episode.episode_id,
    queue_position: null,
    progress_message: "Writing the narrative",
    scene_number: null,
  };

  await page.addInitScript(() => {
    const sockets: EventTarget[] = [];
    class MockWebSocket extends EventTarget {
      static OPEN = 1;
      readyState = 1;
      constructor() {
        super();
        sockets.push(this);
        window.setTimeout(() => this.dispatchEvent(new Event("open")), 0);
      }
      close() {
        this.readyState = 3;
      }
    }
    Object.defineProperty(window, "WebSocket", { value: MockWebSocket, configurable: true });
    Object.defineProperty(window, "__emitTaskEvent", {
      value: (event: unknown) =>
        sockets.forEach((socket) => socket.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(event) }))),
      configurable: true,
    });
  });

  await page.route("**/api/channels", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ channels: [channel] }) }),
  );
  await page.route("**/api/tasks", async (route) => {
    if (route.request().method() === "POST") {
      submittedPipeline = route.request().postDataJSON() as Record<string, unknown>;
      task = {
        ...task,
        task_id: "task_pipeline",
        task_type: "GENERATE_PIPELINE",
        status: "RUNNING",
        started_at: "2026-08-16T00:02:00.000Z",
        completed_at: null,
        output_files: [],
        progress_message: "Building production pipeline",
      };
      await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ task }) });
      return;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ tasks: [task], codex_status: "connected" }) });
  });
  await page.route(`**/api/channels/${channel.channel_id}/dna`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ content: "# DNA", path: channel.channel_dna_path, modified_at: channel.updated_at }),
    }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/topics`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ topics: [] }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ episodes: [episode] }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/file/script.md`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ content: scriptContent, path: episode.script_path, modified_at: episode.updated_at }),
    }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/file/research.md`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        content: "# Research\n\nC01 https://example.com/source",
        path: episode.research_path,
        modified_at: episode.updated_at,
      }),
    }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/file/treatment.md`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ content: "# Treatment\n\n## Sequence 1", path: episode.treatment_path, modified_at: episode.updated_at }),
    }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/file/visual_bible.md`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        content: visualBibleContent,
        path: episode.visual_bible_path,
        modified_at: episode.updated_at,
      }),
    }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/scenes`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ scenes }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}/production-assessment`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ assessment }) }),
  );

  await page.goto("/#/channels");
  await page.getByRole("button", { name: /Episode demo/ }).click();
  await page.getByRole("link", { name: /The Demo Story/ }).click();
  await page.getByRole("tab", { name: "1. Script & Plan", exact: true }).click();

  await expect(page.getByRole("button", { name: "Starting production…", exact: true })).toBeDisabled();
  await expect(page.getByRole("progressbar", { name: "Narration script progress" })).toBeVisible();
  await expect(page.getByText("Old script", { exact: true })).toBeVisible();

  scriptContent = "Fresh script received automatically";
  task = {
    ...task,
    status: "COMPLETED",
    completed_at: "2026-08-16T00:01:00.000Z",
    output_files: [episode.script_path],
    progress_message: "Script saved",
  };
  await page.evaluate((completedTask) => {
    (window as typeof window & { __emitTaskEvent: (event: unknown) => void }).__emitTaskEvent({
      type: "task.updated",
      task: completedTask,
    });
  }, task);

  await expect(page.getByText("Fresh script received automatically", { exact: true })).toBeVisible();
  await expect(page.getByText("Script ready", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Active task progress" })).toHaveCount(0);

  await page.getByRole("button", { name: "Start production", exact: true }).click();
  await expect
    .poll(() => submittedPipeline)
    .toEqual({
      task_type: "GENERATE_PIPELINE",
      channel_id: channel.channel_id,
      episode_id: episode.episode_id,
    });
  await expect(page.getByRole("button", { name: "Starting production…", exact: true })).toBeDisabled();

  visualBibleContent = "# Visual Bible\n\n## CB-01 — Archive room\nKeep the same warm studio lighting.";
  scenes = [
    {
      scene_id: "scene_pipeline_1",
      episode_id: episode.episode_id,
      scene_number: 1,
      duration_seconds: 6,
      dialogue: "The finished scene arrived from the confirmed pipeline.",
      visual_prompt: "CAMERA\nWide archive room\nLIGHTING\nWarm practical light",
      transition_note: "",
      continuity_note: "Keep CB-01",
      sequence_id: "sequence-1",
      sequence_title: "Opening",
      shot_id: "shot-pipeline-1",
      asset_type: "ai_reconstruction",
      continuity_bundle_id: "CB-01",
      reference_asset_ids: ["REF-01"],
      source_ids: ["C01"],
      reconstruction: true,
      sound_cue: "Archive room ambience",
      audio_asset_path: "channels/episode-demo/episodes/the-demo-story/assets/scene-01.wav",
      audio_generated_at: "2026-08-16T00:03:00.000Z",
      audio_duration_seconds: 6,
    },
  ];
  episode.stage = "VIDEO_READY";
  episode.narration_asset_path = "channels/episode-demo/episodes/the-demo-story/assets/narration.wav";
  episode.narration_generated_at = "2026-08-16T00:03:00.000Z";
  episode.narration_duration_seconds = 6;
  episode.narration_segment_count = 1;
  episode.video_asset_path = "channels/episode-demo/episodes/the-demo-story/assets/final.mp4";
  episode.video_generated_at = "2026-08-16T00:04:00.000Z";
  episode.video_duration_seconds = 6;
  episode.render_manifest_path = "channels/episode-demo/episodes/the-demo-story/assets/render-manifest.json";
  task = {
    ...task,
    status: "COMPLETED",
    completed_at: "2026-08-16T00:04:00.000Z",
    output_files: [episode.script_path, episode.visual_bible_path, episode.scene_plan_path, episode.video_asset_path],
    progress_message: "Video ready",
  };
  await page.evaluate((completedTask) => {
    (window as typeof window & { __emitTaskEvent: (event: unknown) => void }).__emitTaskEvent({
      type: "task.updated",
      task: completedTask,
    });
  }, task);

  await expect(page.getByLabel("Rendered video")).toBeVisible();
  await page.getByRole("tab", { name: "2. Visual & Continuity", exact: true }).click();
  await expect(page.locator(".artifact-preview")).toContainText("Keep the same warm studio lighting.");
  await page.getByRole("tab", { name: /3\. Timeline & Shots/ }).click();
  await expect(page.getByText("The finished scene arrived from the confirmed pipeline.", { exact: true })).toBeVisible();
});
