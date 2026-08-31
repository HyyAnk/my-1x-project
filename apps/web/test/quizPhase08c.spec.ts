import { expect, test, type Locator, type Page } from "@playwright/test";
import { installPhase08cAppFixture } from "./phase08cAppFixture";

test.use({ hasTouch: true });

test("P8C-E2E-01 validates Sandbox parity controls, async recovery, accessibility, responsive footer, and Channel sync", async ({
  page,
}) => {
  const appState = await installPhase08cAppFixture(page);
  const previewRequests: Array<Record<string, unknown>> = [];
  let failNextPreview = false;
  let delayedBackground: string | null = null;

  await page.route("**/api/quiz/preview-composition", async (route) => {
    const input = route.request().postDataJSON() as Record<string, unknown>;
    previewRequests.push(input);
    if (failNextPreview) {
      failNextPreview = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Preview unavailable" }) });
      return;
    }
    const response = await route.fetch();
    if (input.background_style === delayedBackground) await new Promise((resolve) => setTimeout(resolve, 450));
    await route.fulfill({ response });
  });

  await page.goto("/#/sandbox");
  await expect(page.getByRole("heading", { name: "Visual Sandbox" })).toBeVisible();
  await expectConfirmedBackground(page, "candy_rays");

  const layout = page.getByRole("combobox", { name: "1. Video Layout" });
  await layout.focus();
  await expect(layout).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(layout).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await expect(layout).toContainText("3-Choice Visual Cards");

  const candy = page.getByRole("button", { name: "7. Background Variant: Candy Rays" });
  const aurora = page.getByRole("button", { name: "7. Background Variant: Aurora Glow" });
  await expectTouchTarget(aurora);
  await aurora.focus();
  await expect(aurora).toBeFocused();
  await expect(aurora).toHaveAttribute("aria-pressed", "false");

  delayedBackground = "aurora_glow";
  await aurora.click();
  await expect(aurora).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status")).toContainText("Verifying video fonts");
  await candy.click();
  await expect(candy).toHaveAttribute("aria-pressed", "true");
  await expectConfirmedBackground(page, "candy_rays");
  await page.waitForTimeout(500);
  await expectConfirmedBackground(page, "candy_rays");

  delayedBackground = null;
  failNextPreview = true;
  await aurora.click();
  const previewAlert = page.locator('.sandbox-preview-canvas [role="alert"]');
  await expect(previewAlert).toContainText("Preview unavailable");
  await page.getByRole("button", { name: "Retry" }).click();
  await expectConfirmedBackground(page, "aurora_glow");
  await expect(previewAlert).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const animationName = await confirmedFrame(page)
    .locator(".aurora-orb-1")
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animationName).toBe("none");

  await page.getByRole("button", { name: "Apply to Channel" }).click();
  const dialog = page.getByRole("dialog", { name: "Apply Style & Mascot to Channel" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("checkbox").uncheck();
  await dialog.getByRole("button", { name: "Apply Changes" }).click();
  await expect(page.getByText("Applied visual styles and mascot to channel: Phase 8C Channel")).toBeVisible();
  expect(appState.channelPatches.at(-1)).toMatchObject({ default_background_style: "aurora_glow" });
  expect(appState.channelReads).toBeGreaterThan(1);
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);

  await verifyDesktopFooterAndCopy(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await candy.tap();
  await expect(candy).toHaveAttribute("aria-pressed", "true");
  await expectConfirmedBackground(page, "candy_rays");
  await verifyMobileLayoutAndFooter(page);

  expect(previewRequests.some((request) => request.layout_id === "visual_choices_three")).toBe(true);
  expect(previewRequests.some((request) => request.background_style === "aurora_glow")).toBe(true);
});

function confirmedFrame(page: Page) {
  return page.frameLocator('iframe[title="HyperFrames Sandbox Frame Preview"]');
}

async function expectConfirmedBackground(page: Page, background: string) {
  await expect(confirmedFrame(page).locator(`[data-background-style="${background}"]`)).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
}

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
}

async function verifyDesktopFooterAndCopy(page: Page) {
  const footer = page.getByText("Develop - Design - Deliver by HyyAnk | Dư Ngọc Minh Hoàng", { exact: true });
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(page.getByText("HyyAnk | Dư Ngọc Minh Hoàng", { exact: true })).toBeHidden();
  const titles = await page.locator(".visual-sandbox-page h1, .visual-sandbox-page h2, .visual-sandbox-page h3").allTextContents();
  expect(titles.filter((title) => title.trim().endsWith("."))).toEqual([]);
}

async function verifyMobileLayoutAndFooter(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  const footer = page.getByText("HyyAnk | Dư Ngọc Minh Hoàng", { exact: true });
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(page.getByText("Develop - Design - Deliver by HyyAnk | Dư Ngọc Minh Hoàng", { exact: true })).toBeHidden();
}
