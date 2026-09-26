import { expect, test } from "@playwright/test";
import { ChannelSchema, EpisodeSchema, TaskSchema } from "@studio/shared";

test("thumbnail status updates independently at desktop and mobile widths", async ({ page }, testInfo) => {
  const timestamp = "2026-09-25T00:00:00.000Z";
  const channel = ChannelSchema.parse({
    channel_id: "ch_test",
    slug: "test",
    display_name: "Test channel",
    status: "ACTIVE",
    description: "",
    target_audience: "",
    language: "English",
    market: "Global",
    channel_dna_path: "dna.md",
    created_at: timestamp,
    updated_at: timestamp,
  });
  const episode = EpisodeSchema.parse({
    episode_id: "ep_test",
    channel_id: channel.channel_id,
    slug: "animal-quiz",
    script_path: "script.md",
    scene_plan_path: "scenes.md",
    dialogue_script_path: "dialogue.md",
    video_prompts_path: "prompts.md",
    topic: { title: "Animal quiz", premise: "Animals", hook: "Animal challenge" },
    stage: "VIDEO_READY",
    created_at: timestamp,
    updated_at: timestamp,
    video_asset_path: "video.mp4",
    video_duration_seconds: 5,
  });
  let thumbnail = TaskSchema.parse({
    task_id: "thumbnail",
    task_type: "GENERATE_THUMBNAIL",
    channel_id: channel.channel_id,
    episode_id: episode.episode_id,
    lock_key: "ep:thumbnail",
    status: "RUNNING",
    created_at: timestamp,
    started_at: timestamp,
    progress_message: "Generating thumbnail",
  });
  const video = TaskSchema.parse({
    ...thumbnail,
    task_id: "video",
    task_type: "GENERATE_VIDEO",
    status: "COMPLETED",
    progress_message: "Completed",
  });
  let manifest: Record<string, unknown> | null = null;
  const unexpected: string[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  await page.addInitScript(() => {
    class MockSocket extends EventTarget {
      static OPEN = 1;
      readyState = 1;
      constructor() {
        super();
        window.addEventListener("test-task-event", (event) =>
          this.dispatchEvent(new MessageEvent("message", { data: (event as CustomEvent<string>).detail })),
        );
        setTimeout(() => this.dispatchEvent(new Event("open")), 0);
      }
      close() {
        this.readyState = 3;
      }
    }
    Object.defineProperty(window, "WebSocket", { value: MockSocket });
  });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (route.request().method() !== "GET" && url.pathname !== "/api/quiz/preview-composition") unexpected.push(url.pathname);
    let body: unknown = {};
    if (url.pathname === "/api/channels") body = { channels: [channel] };
    else if (url.pathname === "/api/image/balance") body = { balance_vnd: 0 };
    else if (url.pathname.includes("style-presets")) body = { presets: [] };
    else if (url.pathname.includes("intro-outro")) body = { styles: [], categories: [] };
    else if (url.pathname.endsWith("/episodes")) body = { episodes: [episode] };
    else if (url.pathname === "/api/tasks") body = { tasks: [thumbnail, video], codex_status: "connected" };
    else if (url.pathname === "/api/config")
      body = {
        video_generation: { max_scene_duration_seconds: 8, narration_words_per_second: 2.3 },
        image_generation: { enabled: true, images_per_bundle: 1 },
        audio_generation: {},
        codex: {},
      };
    else if (url.pathname === "/api/storage") body = { configured: true, path: "D:/Fixture" };
    else if (url.pathname.endsWith("/thumbnail")) body = { manifest };
    else if (url.pathname.endsWith("/quiz-v2"))
      body = {
        quiz: null,
        director_plan: null,
        asset_plan: null,
        asset_resolution: null,
        voice_plan: null,
        timeline: null,
        assessment: null,
        stages: { questions: "ready", render: "ready" },
      };
    else if (url.pathname.endsWith("/scenes")) body = { scenes: [] };
    else if (url.pathname.endsWith("/images")) body = { images: [] };
    else if (url.pathname.endsWith("/topics")) body = { topics: [] };
    else if (url.pathname.endsWith("/production-assessment")) body = { assessment: null };
    else if (url.pathname.includes("/file/") || url.pathname.endsWith("/dna")) body = { content: "# Fixture", modified_at: timestamp };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/#/channels/ch_test/episodes/ep_test");
  await expect.poll(() => pageErrors).toEqual([]);
  const panel = page.locator(".quiz-thumbnail-panel");
  await expect
    .poll(async () =>
      pageErrors.length
        ? pageErrors.join("; ")
        : await panel
            .getByRole("status")
            .textContent({ timeout: 500 })
            .catch(() => "missing"),
    )
    .toBe("Generating thumbnail");
  await expect(page.getByRole("link", { name: "Download MP4" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Generating…", exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile.png") });
  thumbnail = { ...thumbnail, status: "FAILED", completed_at: new Date().toISOString(), error: "Provider failed" };
  await page.evaluate(
    (task) => window.dispatchEvent(new CustomEvent("test-task-event", { detail: JSON.stringify({ type: "task.updated", task }) })),
    thumbnail,
  );
  await expect(panel.getByRole("status")).toHaveText("Thumbnail failed. Retry with Generate.");
  await expect(panel.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
  await panel.getByRole("button", { name: "Generate", exact: true }).focus();
  await expect(panel.getByRole("button", { name: "Generate", exact: true })).toBeFocused();
  manifest = {
    episode_id: episode.episode_id,
    channel_id: channel.channel_id,
    layout: "mega_grid",
    hook_text: "Animal quiz",
    history: [],
    asset_path_16_9: "thumbnail.jpg",
    updated_at: new Date(Date.now() + 1000).toISOString(),
  };
  episode.thumbnail_asset_path_16_9 = "thumbnail.jpg";
  episode.updated_at = new Date().toISOString();
  thumbnail = { ...thumbnail, status: "COMPLETED", error: null, completed_at: new Date().toISOString() };
  await page.evaluate(
    (task) => window.dispatchEvent(new CustomEvent("test-task-event", { detail: JSON.stringify({ type: "task.updated", task }) })),
    thumbnail,
  );
  await expect(panel.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download MP4" })).toBeVisible();
  expect(unexpected).toEqual([]);
});
