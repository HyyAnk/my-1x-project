import { expect, test } from "@playwright/test";
import { mockPairWorkspace } from "./helpers/pairWorkspaceFixture";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

let fixtureRoot: string;
let video: string;
test("shows a completed clip while its sibling is still running", async ({ page }) => {
  const state = await mockPairWorkspace(page);
  state.hold = true;
  state.partialReady = true;
  await page.goto("/test/fixtures/pairWorkspace.html");
  await page.getByRole("button", { name: "Generate Script", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Intro script", exact: true })).toHaveValue("Intro ready while outro runs");
  await expect(page.getByText("1/2 scripts processed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy intro script" })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Outro script", exact: true })).toHaveValue("");
  state.hold = false;
  await expect(page.getByRole("textbox", { name: "Outro script", exact: true })).toHaveValue("Generated outro 1");
});
test.beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "pair-browser-video-"));
  video = path.join(fixtureRoot, "video.mp4");
  await promisify(execFile)(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", "color=c=blue:s=1920x1080:d=0.2", "-c:v", "libx264", "-pix_fmt", "yuv420p", video],
    { windowsHide: true },
  );
});
test.afterAll(async () => {
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
});

for (const width of [1440, 390]) {
  test(`pair workspace generate, edit, regenerate and reopen at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await mockPairWorkspace(page);
    await page.goto("/test/fixtures/pairWorkspace.html");
    const auto = page.getByRole("checkbox", { name: "Auto identity", exact: true });
    await expect(auto).toBeChecked();
    await expect(page.getByRole("tab", { name: "Video Pairs" })).toHaveCount(0);
    await expect(page.getByText("Creative direction", { exact: true })).toHaveCount(0);
    await auto.uncheck();
    state.pollFailures = 1;
    await page.getByRole("button", { name: "Generate Script", exact: true }).click();
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Intro script", exact: true })).toHaveValue("Generated intro 1");
    expect(state.requests[0].auto_identity).toBe(false);
    const intro = page.getByRole("textbox", { name: "Intro script", exact: true });
    state.saveFailures = 1;
    await intro.fill("My edited script");
    await expect(page.getByRole("button", { name: "Retry save" })).toBeVisible();
    await page.getByRole("button", { name: "Retry save" }).click();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Regenerate", exact: true }).click();
    expect(state.requests).toHaveLength(1);
    state.failed = true;
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Regenerate", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry failed" })).toBeVisible();
    await expect(intro).toHaveValue("My edited script");
    state.failed = false;
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Retry failed" }).click();
    await expect(intro).toHaveValue("Generated intro 3");
    expect(state.requests[0].clips[0].randomization_seed).not.toBe(state.requests[2].clips[0].randomization_seed);
    await page.getByRole("button", { name: "Back to styles" }).click();
    await page.getByRole("button", { name: "Open Style" }).click();
    await expect(auto).toBeChecked();
    await expect(intro).toHaveValue("Generated intro 3");
    await expect(page.getByRole("button", { name: "Regenerate", exact: true })).toBeEnabled();
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy intro script", exact: true }).click();
    await expect(page.getByText("Copied", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Generated intro 3");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`script-${width}.png`), fullPage: true });
    await page.getByRole("tab", { name: "Upload", exact: true }).click();
    await expect(page.getByLabel("Intro video", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Outro video", { exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Mute audio" })).toHaveCount(2);
    await expect(page.getByText("Transition preview", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`upload-${width}.png`), fullPage: true });
  });
}

test("uploads independently without generation and refreshes the pair grid", async ({ page }) => {
  const state = await mockPairWorkspace(page);
  state.uploadFailures = 1;
  await page.goto("/test/fixtures/pairWorkspace.html");
  await page.getByRole("tab", { name: "Upload", exact: true }).click();
  await page.getByLabel("Intro video", { exact: true }).setInputFiles(video);
  await page.getByLabel("Outro video", { exact: true }).setInputFiles(video);
  await page.getByRole("checkbox", { name: "Mute audio" }).first().check();
  await page.getByRole("button", { name: "Upload Pair", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Upload Pair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "001", exact: true })).toBeVisible();
  expect(state.requests).toHaveLength(0);
  expect(state.uploads).toHaveLength(2);
  expect(state.uploads[1].style_id).toBe(state.uploads[0].style_id);
  expect(state.uploads[0]).toMatchObject({ auto_name: true, intro_mute_audio: true, outro_mute_audio: false });
  expect(state.uploads[0]).not.toHaveProperty("name");
  await expect(page.getByRole("article", { name: "New Pair", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload Pair", exact: true })).toBeDisabled();
  expect(await page.getByLabel("Intro video", { exact: true }).evaluate((input: HTMLInputElement) => input.files?.length)).toBe(0);
});

test("reopens a running job and finishes without another generation request", async ({ page }) => {
  const state = await mockPairWorkspace(page);
  state.hold = true;
  await page.goto("/test/fixtures/pairWorkspace.html");
  await page.getByRole("button", { name: "Generate Script", exact: true }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await page.getByRole("button", { name: "Back to styles" }).click();
  await page.getByRole("button", { name: "Open Style" }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  state.hold = false;
  await expect(page.getByRole("textbox", { name: "Intro script", exact: true })).toHaveValue("Generated intro 1");
  expect(state.requests).toHaveLength(1);
});
