import { expect, test } from "@playwright/test";

/**
 * Shared setup for the smoke spec suite.
 *
 * Mirrors the `test.beforeEach` block of the original `smoke.spec.ts` god file:
 * baseline tasks and storage API route mocks, the localStorage init script and
 * the `MockWebSocket` init script. Spec files re-export `smokeTest` so every
 * test keeps the exact original fixture behavior.
 */
export const smokeTest = test.extend({
  // eslint-disable-next-line no-empty-pattern
  page: async ({ page }, use, testInfo) => {
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
    await use(page);
    void testInfo;
  },
});

export { expect };

/**
 * Production assessment payload shared by the episode-focused smoke tests
 * (verbatim from the original `smoke.spec.ts` module-level constant).
 */
export const assessment = {
  score: 62,
  rating: "needs_work",
  assessed_at: "2026-08-17T00:00:00.000Z",
  metrics: {
    target_duration_seconds: 480,
    estimated_narration_seconds: 300,
    narration_word_count: 700,
    target_word_count: 1050,
    scene_count: 1,
    sequence_count: 1,
    unique_prompt_ratio: 1,
    structured_prompt_ratio: 0,
    continuity_coverage_ratio: 0,
    source_coverage_ratio: 0,
    narration_coverage_ratio: 1,
    factual_anchor_count: 2,
    research_source_count: 5,
  },
  issues: [
    {
      code: "visual_bible",
      severity: "blocker",
      message: "Visual bible needs continuity bundles",
      next_action: "Generate the visual bible",
      scene_numbers: [],
    },
  ],
};
