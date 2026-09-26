import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`single-pass approval is accessible at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/test/fixtures/introOutroRevision.html");
    await expect(page.getByText("AI review not required")).toBeVisible();
    await expect(page.getByText("What Gemini reviewed")).toHaveCount(0);
    const approve = page.getByRole("button", { name: "Use for upload" });
    await expect(approve).toBeEnabled();
    await approve.focus();
    await expect(approve).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Continue to upload" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`revision-${width}.png`), fullPage: true });
  });
}
