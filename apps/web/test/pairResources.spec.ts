import { expect, test } from "@playwright/test";
import { mockPairWorkspace } from "./helpers/pairWorkspaceFixture";

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
});

for (const width of [1440, 390]) {
  test(`resource copy and download at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockPairWorkspace(page);
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#00aacc";
      context.fillRect(16, 16, 32, 32);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    const liveChannel = process.env.PAIR_RESOURCE_LIVE_CHANNEL;
    const base = `/api/channels/${liveChannel ?? "channel"}/intro-outro-resources`;
    await page.route("**/intro-outro-resources*", async (route) => {
      if (liveChannel) {
        const response = await page.request.get(`http://127.0.0.1:4310${base}?style_preset_id=preset_arcade_classic`);
        return route.fulfill({ json: await response.json() });
      }
      return route.fulfill({
        json: {
          resources: ["mascot", "logo"].map((kind) => ({ kind, preview_url: `${base}/${kind}`, transparent_url: `${base}/${kind}` })),
        },
      });
    });
    await page.route("**/intro-outro-resources/*", async (route) => {
      if (!liveChannel) return route.fulfill({ contentType: "image/png", body: Buffer.from(png, "base64") });
      const response = await page.request.get(
        `http://127.0.0.1:4310${new URL(route.request().url()).pathname}?style_preset_id=preset_arcade_classic`,
      );
      await route.fulfill({ response });
    });
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/test/fixtures/pairWorkspace.html");
    const card = page.getByRole("region", { name: "Mascot", exact: true });
    const copy = card.getByRole("button", { name: "Copy mascot image" });
    await expect(copy).toBeEnabled();
    await copy.focus();
    await expect(card.locator(".pair-resource-actions")).toHaveCSS("opacity", "1");
    await copy.click();
    await expect(card.getByRole("status")).toHaveText("Copied");
    expect(await page.evaluate(async () => (await navigator.clipboard.read())[0].types)).toContain("image/png");
    const download = page.waitForEvent("download");
    await card.getByRole("button", { name: "Download mascot PNG" }).click();
    expect((await download).suggestedFilename()).toContain("mascot_transparent.png");
    await expect(card.getByRole("status")).toHaveText("Download started");
    await expect(page.getByRole("button", { name: "Generate Script", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`resources-${width}.png`), fullPage: true });
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "write", {
        configurable: true,
        value: () => Promise.reject(new Error("Clipboard permission denied")),
      });
    });
    await copy.click();
    await expect(card.getByRole("status")).toHaveText("Clipboard permission denied");
    await expect(card.getByRole("button", { name: "Download mascot PNG" })).toBeEnabled();
  });
}

test("resource error recovery and missing transparency do not block scripts", async ({ page }) => {
  await mockPairWorkspace(page);
  let failed = true;
  await page.route("**/intro-outro-resources*", (route) =>
    failed
      ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
      : route.fulfill({
          json: {
            resources: [
              { kind: "mascot", preview_url: null, transparent_url: null },
              { kind: "logo", preview_url: "/missing.png", transparent_url: null },
            ],
          },
        }),
  );
  await page.goto("/test/fixtures/pairWorkspace.html");
  await expect(page.getByText("Resources could not be loaded. Retry using Refresh resources.")).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "Refresh resources" }).click();
  await expect(page.getByText("Transparent PNG unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy mascot image" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Generate Script", exact: true })).toBeEnabled();
});
