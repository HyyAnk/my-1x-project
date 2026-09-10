import { expect, test } from "@playwright/test";

const mockChannel = {
  channel_id: "channel-playwright-001",
  slug: "wildlife-trivia",
  display_name: "Wildlife Trivia",
  description: "Channel for wildlife trivia shorts",
  target_audience: "Nature lovers",
  language: "en",
  country: "US",
  market: "US",
  channel_dna_path: "channels/wildlife-trivia/dna.md",
  style_guide_path: null,
  status: "ACTIVE",
  created_at: "2026-09-07T12:00:00.000Z",
  updated_at: "2026-09-07T12:00:00.000Z",
  episode_count: 0,
  voice_reference_path: null,
};

const mockShortReel = {
  channel_id: "channel-playwright-001",
  reel_id: "sreel_pw_001",
  revision: 1,
  topic: {
    topic_id: "topic_pw_001",
    channel_id: "channel-playwright-001",
    title: "Falcon vs Cheetah Velocity",
    premise: "Comparing raw diving speed against land acceleration.",
    hook: "Can any creature break 200 mph without an engine?",
    origin: "discovery",
  },
  source: {
    fidelity: "complete",
    original_question: {
      id: "bank_quest_pw_001",
      archetype_id: "versus_faceoff",
      domain_id: "animals",
      subtopic_id: "speed",
      language: "en",
      question: "Which raptor holds the fastest recorded hunting dive speed?",
      format: "multiple_choice",
      choices: [
        { id: "A", text: "Peregrine Falcon", is_correct: true },
        { id: "B", text: "Golden Eagle", is_correct: false },
      ],
      correct_choice_id: "A",
      explanation: "Peregrine falcons reach over 240 mph during high-altitude hunting stoops.",
      status: "approved",
      age_band: "family",
    },
    source_type: "bank_question",
    question_id: "bank_quest_pw_001",
    archetype_id: "versus_faceoff",
    question_text: "Which raptor holds the fastest recorded hunting dive speed?",
    choices: [
      { id: "A", text: "Peregrine Falcon", is_correct: true },
      { id: "B", text: "Golden Eagle", is_correct: false },
    ],
    correct_choice_id: "A",
    explanation: "Peregrine falcons reach over 240 mph during high-altitude hunting stoops.",
    selected_answer_text: "Peregrine Falcon",
    source_language: "en",
    translation_provenance: "source",
    content_hash: "abcd1234efgh5678",
  },
  script: {
    segments: [
      {
        index: 1,
        mode: "generate",
        duration_seconds: 8.5,
        narrative: "A peregrine falcon perches high on a cliff ledge, scoping prey.",
        text_cues: [
          {
            role: "question",
            text: "Which raptor holds the fastest recorded hunting dive speed?",
            start_seconds: 0.5,
            end_seconds: 6.0,
          },
        ],
        audio_direction: "Wind whistling over high mountain peaks.",
        start_state: {
          character_identity: "Novy",
          position: "cliff edge",
          action: "watching sky",
          camera: "wide landscape",
          environment: "mountain cliff",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
        end_state: {
          character_identity: "Novy",
          position: "cliff edge",
          action: "pointing upward",
          camera: "wide landscape",
          environment: "mountain cliff",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
      },
      {
        index: 2,
        mode: "extend",
        duration_seconds: 9.0,
        narrative: "The falcon tucks its wings and accelerates into a sheer vertical stoop.",
        text_cues: [
          {
            role: "supporting",
            text: "Terminal velocity exceeds 240 mph in a dive!",
            start_seconds: 1.0,
            end_seconds: 7.0,
          },
        ],
        audio_direction: "Roaring aerodynamic wind and sonic rush.",
        start_state: {
          character_identity: "Novy",
          position: "sky view",
          action: "tracking dive",
          camera: "downward follow",
          environment: "sky descent",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
        end_state: {
          character_identity: "Novy",
          position: "sky view",
          action: "tracking dive",
          camera: "downward follow",
          environment: "sky descent",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
      },
      {
        index: 3,
        mode: "extend",
        duration_seconds: 8.5,
        narrative: "The falcon pulls up with precision as the final answer is confirmed.",
        text_cues: [
          {
            role: "answer",
            text: "Answer: Peregrine Falcon dives at 240+ mph!",
            start_seconds: 0.5,
            end_seconds: 6.5,
          },
        ],
        audio_direction: "Victorious musical flourish.",
        start_state: {
          character_identity: "Novy",
          position: "valley floor",
          action: "celebrating",
          camera: "heroic close-up",
          environment: "valley",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
        end_state: {
          character_identity: "Novy",
          position: "valley floor",
          action: "celebrating",
          camera: "heroic close-up",
          environment: "valley",
          props: [],
          visible_text: [],
          revealed_facts: [],
        },
      },
    ],
    total_duration_seconds: 26.0,
  },
  units: {
    script: {
      state: "ready",
      last_accepted_payload: { script: null, compiled_prompts: ["Prompt 1", "Prompt 2", "Prompt 3"] },
      current_attempt: null,
    },
    references: {
      state: "ready",
      last_accepted_payload: {
        references: [
          {
            asset_id: "mascot-reference",
            role: "mascot",
            path: "short-reels/assets/mascot.png",
            mime_type: "image/png",
            width: 512,
            height: 512,
            checksum: "abcdef1234567890",
          },
        ],
      },
      current_attempt: null,
    },
    cover: {
      state: "ready",
      last_accepted_payload: {
        asset_id: "cover-reference",
        path: "short-reels/assets/cover.png",
        mime_type: "image/png",
        width: 1080,
        height: 1920,
        checksum: "1234567890abcdef",
      },
      current_attempt: null,
    },
    publishing: {
      state: "ready",
      last_accepted_payload: {
        title: "Can any bird outfly gravity?",
        description: "Peregrine falcon diving speed analysis. #falcon #speed #nature",
      },
      current_attempt: null,
    },
  },
  model_note: "Omni 1.1 Flash",
  stale_segments: [],
  created_at: "2026-09-07T12:00:00.000Z",
  updated_at: "2026-09-07T12:05:00.000Z",
};

test.describe("Short-Reel Studio E2E Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/channels", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ channels: [mockChannel] }) }),
    );
    await page.route("**/api/channels/channel-playwright-001", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ channel: mockChannel }) }),
    );
    await page.route("**/api/channels/channel-playwright-001/short-reels", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ short_reels: [mockShortReel] }) }),
    );
    await page.route("**/api/channels/channel-playwright-001/short-reels/sreel_pw_001", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ short_reel: mockShortReel }) }),
    );
    await page.route("**/api/tasks", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ tasks: [], codex_status: "connected" }) }),
    );
    await page.route("**/api/storage", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          path: "D:/Studio",
          default_path: "D:/Studio",
          channel_path: "D:/Studio/channels",
          configured: true,
        }),
      }),
    );
    await page.addInitScript(() => {
      window.localStorage.setItem("studio-simplify-mode", "false");
      class MockWebSocket extends EventTarget {
        static OPEN = 1;
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
  });

  test("renders Short-Reel studio and switches between primary tabs across viewports", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#/channels/channel-playwright-001/short-reels/sreel_pw_001");
    await expect(page.getByRole("heading", { name: "Falcon vs Cheetah Velocity" })).toBeVisible();

    for (const viewport of [
      { width: 1440, height: 900, name: "desktop" },
      { width: 390, height: 844, name: "mobile" },
      { width: 320, height: 600, name: "narrow" },
    ]) {
      await page.setViewportSize(viewport);
      await page.getByRole("tab", { name: "Assets & Prompts" }).click();
      await expect(page.getByRole("heading", { name: "Portrait Style Reference" })).toBeVisible();
      await page.getByRole("tab", { name: "Publishing Metadata" }).click();
      await expect(page.getByRole("heading", { name: "Publishing & Distribution" })).toBeVisible();
      await page.getByRole("tab", { name: "Script & Segments" }).click();
      await expect(page.getByRole("heading", { name: "Script Segments" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: `test-results/short-reel-${viewport.name}.png`, fullPage: true });
    }
  });
});
