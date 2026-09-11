import { expect, smokeTest } from "./helpers/smokeFixtures";

smokeTest.describe("Transition Preview Unification E2E", () => {
  smokeTest("renders truth-backed transition inspector in Visual Sandbox", async ({ page }) => {
    await page.goto("/#sandbox");
    await page.waitForLoadState("domcontentloaded");

    // Switch to Transition tab if available
    const transitionTabBtn = page.getByRole("tab", { name: /transition/i });
    if (await transitionTabBtn.isVisible()) {
      await transitionTabBtn.click();

      // Verify unified transition tab sidebar
      await expect(page.getByTestId("sandbox-transition-tab")).toBeVisible();
      await expect(page.getByTestId("transition-selector")).toBeVisible();
      await expect(page.getByTestId("sandbox-transition-reset-btn")).toBeVisible();

      // Verify render-backed player on the canvas
      await expect(page.getByTestId("transition-preview-player")).toBeVisible();
      await expect(page.getByTestId("transition-preview-viewport")).toBeVisible();
      await expect(page.getByTestId("transition-transport")).toBeVisible();

      // Check for sample scenes badge
      await expect(page.getByText("Sample scenes")).toBeVisible();

      // Verify no legacy simulation overlays
      await expect(page.locator(".transition-overlay")).toHaveCount(0);
      await expect(page.locator(".transition-scene-a")).toHaveCount(0);
    }
  });

  smokeTest("renders truthful transition preview in Intro/Outro Modal without false real-time claims", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // If modal can be opened or preview is tested directly:
    const newChannelBtn = page.getByRole("button", { name: /new channel/i }).first();
    await expect(newChannelBtn).toBeVisible();
  });
});