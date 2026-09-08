import { expect } from "@playwright/test";

import { smokeTest } from "./helpers/smokeFixtures";

smokeTest("channel deletion requires an explicit Yes and typed confirmation", async ({ page }) => {
  const channel = {
    channel_id: "ch_delete",
    slug: "delete-demo",
    display_name: "Delete demo",
    description: "A channel used to verify safe deletion.",
    target_audience: "Viewers",
    language: "English",
    market: "Global",
    channel_dna_path: "channels/delete-demo/channel_dna.md",
    style_guide_path: "channels/delete-demo/style_guide.md",
    status: "ACTIVE",
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
    episode_count: 0,
  };
  let deleted = false;
  let deleteContentType: string | null = null;
  await page.route("**/api/channels", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ channels: deleted ? [] : [channel] }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}?confirm=true`, async (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    deleteContentType = route.request().headers()["content-type"] ?? null;
    deleted = true;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/#/channels");
  const card = page.locator(".channel-card").filter({ hasText: "Delete demo" });
  await card.getByRole("button", { name: "More options", exact: true }).click();
  const deleteButton = card.getByRole("menuitem", { name: "Delete", exact: true });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  await expect(page.getByRole("heading", { name: "Delete this channel", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await card.getByRole("button", { name: "More options", exact: true }).click();
  await deleteButton.click();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  const confirmation = page.getByRole("textbox", { name: "Type Yes to confirm", exact: true });
  const finalDelete = page.getByRole("dialog").getByRole("button", { name: "Delete channel", exact: true });
  await expect(confirmation).toBeVisible();
  await expect(finalDelete).toBeDisabled();
  await confirmation.fill("yes");
  await expect(finalDelete).toBeDisabled();
  await confirmation.fill("Yes");
  await expect(finalDelete).toBeEnabled();
  await finalDelete.click();
  await expect(page.getByText("Delete demo", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Channel deleted: Delete demo");
  expect(deleteContentType).toBeNull();
});

smokeTest("episode deletion uses a direct Yes or No confirmation", async ({ page }) => {
  const channel = {
    channel_id: "ch_episode_delete",
    slug: "episode-delete",
    display_name: "Episode delete channel",
    description: "A channel used to verify episode deletion.",
    target_audience: "Viewers",
    language: "English",
    market: "Global",
    channel_dna_path: "channels/episode-delete/channel_dna.md",
    style_guide_path: null,
    status: "ACTIVE",
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
    episode_count: 1,
  };
  const episode = {
    episode_id: "ep_delete",
    channel_id: channel.channel_id,
    slug: "episode-to-delete",
    topic: { title: "Episode to delete", premise: "A temporary episode", hook: "Should it go?" },
    stage: "SELECTED",
    script_path: "channels/episode-delete/episodes/episode-to-delete/script.md",
    research_path: "channels/episode-delete/episodes/episode-to-delete/research.md",
    treatment_path: "channels/episode-delete/episodes/episode-to-delete/treatment.md",
    visual_bible_path: "channels/episode-delete/episodes/episode-to-delete/visual_bible.md",
    scene_plan_path: "channels/episode-delete/episodes/episode-to-delete/scene_plan.md",
    dialogue_script_path: "channels/episode-delete/episodes/episode-to-delete/dialogue_script.md",
    video_prompts_path: "channels/episode-delete/episodes/episode-to-delete/video_prompts.md",
    target_duration_minutes: 8,
    target_word_count: 1050,
    narration_asset_path: null,
    narration_generated_at: null,
    narration_duration_seconds: null,
    narration_segment_count: 0,
    measured_narration_words_per_second: null,
    quiz_config: {},
    video_asset_path: null,
    video_generated_at: null,
    video_duration_seconds: null,
    render_manifest_path: null,
    created_at: channel.created_at,
    updated_at: channel.updated_at,
  };
  let deleted = false;
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
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ topics: [] }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ episodes: deleted ? [] : [episode] }) }),
  );
  await page.route(`**/api/channels/${channel.channel_id}/episodes/${episode.episode_id}?confirm=true`, async (route) => {
    if (route.request().method() !== "DELETE") return route.continue();
    deleted = true;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/#/channels");
  await page.getByRole("button", { name: /Episode delete channel/ }).click();
  const row = page.locator(".episode-card").filter({ hasText: "Episode to delete" });
  await expect(row).toBeVisible();
  await row.hover();
  const deleteButton = row.getByRole("button", { name: "Delete episode Episode to delete", exact: true });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  await expect(page.getByRole("heading", { name: "Delete this episode", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toBeVisible();
  await row.hover();
  await deleteButton.click();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByText("Episode to delete", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Episode deleted: Episode to delete");
});
