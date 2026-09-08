import { expect } from "@playwright/test";

import { smokeTest } from "./helpers/smokeFixtures";

smokeTest("workspace opens with an actionable empty state", async ({ page }) => {
  await page.route("**/api/codex/settings", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: /new channel/i }).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Codex model" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("tab", { name: "AI Engines" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: /Voice & Audio/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Media & Generation" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Storage & System" })).toBeVisible();
});

smokeTest("channel creation requires a concise channel name", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /new channel/i })
    .first()
    .click();
  const modal = page.locator("form.modal");
  const submit = modal.getByRole("button", { name: "Create channel", exact: true });
  await expect(page.getByRole("heading", { name: "Create new channel", exact: true })).toBeVisible();
  await expect(submit).toBeDisabled();
  await modal.getByLabel("Channel Name").fill("CI channel");
  await expect(submit).toBeEnabled();
});

smokeTest("channel library exposes channels and the primary create action", async ({ page }) => {
  const quiz = {
    channel_id: "ch_group_quiz",
    slug: "group-quiz",
    display_name: "Group quiz",
    description: "Quiz",
    target_audience: "Children",
    language: "English",
    market: "Global",
    channel_dna_path: "channels/group-quiz/channel_dna.md",
    style_guide_path: "channels/group-quiz/style_guide.md",
    status: "DRAFT",
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
    episode_count: 0,
  };
  const nature = {
    ...quiz,
    channel_id: "ch_group_nature",
    slug: "group-nature",
    display_name: "Group nature",
    description: "Nature quiz",
  };
  await page.route("**/api/channels", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ channels: [quiz, nature] }) }),
  );
  await page.goto("/");
  await page.getByRole("link", { name: "Channels", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Channels", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Group quiz/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Group nature/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "New Quiz Channel", exact: true })).toBeVisible();
});
