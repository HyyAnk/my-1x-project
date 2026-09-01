import type { Page, Route } from "@playwright/test";

export type Phase08cAppState = {
  channelPatches: Array<Record<string, unknown>>;
  channelReads: number;
};

export async function installPhase08cAppFixture(page: Page): Promise<Phase08cAppState> {
  const state: Phase08cAppState = { channelPatches: [], channelReads: 0 };
  const channel = phase08cChannel();

  await page.addInitScript(() => {
    window.localStorage.setItem("studio-simplify-mode", "false");
    window.localStorage.setItem("studio-theme", "dark");
    class MockWebSocket extends EventTarget {
      static OPEN = 1;
      static CONNECTING = 0;
      readyState = 1;
      constructor() {
        super();
        window.setTimeout(() => this.dispatchEvent(new Event("open")), 0);
      }
      close() {
        this.readyState = 3;
      }
    }
    Object.defineProperty(window, "WebSocket", { value: MockWebSocket, configurable: true });
  });

  await page.route("**/api/config", (route) => json(route, phase08cConfig()));
  await page.route("**/api/storage", (route) =>
    json(route, { path: "D:/Studio", default_path: "D:/Studio", channel_path: "D:/Studio/channels", configured: true }),
  );
  await page.route("**/api/channels", (route) => {
    state.channelReads += 1;
    return json(route, { channels: [channel] });
  });
  await page.route(`**/api/channels/${channel.channel_id}`, async (route) => {
    const patch = route.request().postDataJSON() as Record<string, unknown>;
    state.channelPatches.push(patch);
    Object.assign(channel, patch);
    await json(route, channel);
  });
  await page.route(`**/api/channels/${channel.channel_id}/mascot`, (route) => json(route, { channel }));
  await page.route("**/api/tasks", (route) => json(route, { tasks: [], codex_status: "connected" }));
  await page.route("**/api/mascots", (route) => json(route, { mascots: [] }));
  await page.route("**/api/git", (route) => json(route, { branch: "main", dirty: true, changed_files: 1 }));
  await page.route("**/api/image/balance", (route) => json(route, { balance_vnd: 0 }));
  await page.route("**/api/voice/rendered-metrics", (route) =>
    json(route, { rendered_characters: 0, rendered_duration_seconds: 0, rendered_segments_count: 0, rendered_episodes_count: 0 }),
  );
  await page.route("**/api/codex/settings", (route) =>
    json(route, {
      settings: {
        transport: "app_server",
        model: "",
        api_base_url: "",
        has_api_key: false,
        app_server_endpoint: "stdio://",
        command: "codex",
      },
      models: [],
      installation: { installed: false, command: "codex", version: null },
    }),
  );
  await page.route("**/api/antigravity/settings", (route) => json(route, { settings: {}, models: [] }));
  await page.route("**/api/engine", (route) =>
    json(route, {
      active_engine: "codex",
      status: "connected",
      model: "",
      codex: { status: "connected", model: "", models: [] },
      antigravity: { status: "ready", model: "", models: [] },
    }),
  );

  return state;
}

function phase08cChannel() {
  return {
    channel_id: "ch_phase08c",
    slug: "phase-08c",
    display_name: "Phase 8C Channel",
    description: "",
    target_audience: "Children",
    language: "English",
    country: "GLOBAL",
    market: "",
    channel_dna_path: "channels/phase-08c/channel_dna.md",
    style_guide_path: null,
    status: "ACTIVE",
    created_at: "2026-08-31T00:00:00.000Z",
    updated_at: "2026-08-31T00:00:00.000Z",
    episode_count: 0,
    voice_reference_path: null,
    selected_styles: ["pixar_3d"],
    default_thinking_bar_style: "star_slider",
    default_question_box_style: "candy_pop",
    default_answer_card_style: "glossy_arcade",
    default_counter_style: "hanging_woodsign",
    default_background_style: "candy_rays",
    default_palette_id: "lime",
    mascot_id: null,
    mascot_config: { enabled: false, position: "bottom_left", scale: 1 },
  };
}

function phase08cConfig() {
  return {
    video_generation: { aspect_ratio: "16:9", fast_render_mode: true, render_quality: "medium", fps: 30, render_workers: 1 },
    image_generation: { enabled: false, model: "gpt-image-2" },
    audio_generation: { provider: "none", service_url: "", max_concurrent_tasks: 1 },
    codex: { max_concurrent_tasks: 1, transport: "app_server", command: "codex", model: "" },
  };
}

async function json(route: Route, body: unknown) {
  await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
}
