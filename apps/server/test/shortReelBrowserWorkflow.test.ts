import { mkdtemp, mkdir, cp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { saveStorageRoot } from "../src/config.js";
import { repairSource } from "./helpers/shortReelRepairFixture.js";
import type { ShortReelTopicCandidate } from "@studio/shared";

it("creates a real draft from its card, reopens it, and reconnects without duplicate persistence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "short-reel-browser-"));
  await mkdir(path.join(root, "templates"));
  await writeFile(path.join(root, "templates/example_channel_dna.md"), "# DNA\n");
  await writeFile(path.join(root, "templates/example_style_guide.md"), "# Style\n");
  await cp(path.resolve("../web/dist"), path.join(root, "apps/web/dist"), { recursive: true });
  await saveStorageRoot(root, root);
  const app = await buildApp(root, { llmClient: null });
  const browser = await chromium.launch({ headless: true });
  try {
    const channel = await app.repository.createChannel({ name: "Browser Reel", language: "English", dna_mode: "example" });
    await app.repository.saveQuestionBankQuestion(repairSource.original_question!);
    const topic: ShortReelTopicCandidate = {
      topic_id: "browser-topic",
      channel_id: channel.channel_id,
      title: "Speed comparison",
      premise: "Compare two speeds",
      hook: "Which speed is higher?",
      why_it_fits: "Clear comparison",
      estimated_potential: "High",
      generated_at: new Date().toISOString(),
      selected: false,
      content_kind: "short_reel",
      origin: "discovery",
      archetype: "versus_faceoff",
      question_count: 1,
      aspect_ratio: "9:16",
    };
    const episode = {
      ...topic,
      content_kind: "episode" as const,
      question_count: 5,
      quiz_format: "multiple_choice" as const,
      archetype: "deep_trivia" as const,
      age_band: "family" as const,
      visual_style: "flat_vector" as const,
    };
    await app.repository.saveTopicRun(channel.channel_id, [
      { ...episode, topic_id: "ep-1" },
      { ...episode, topic_id: "ep-2" },
      { ...episode, topic_id: "ep-3" },
      topic,
      { ...topic, topic_id: "second-reel", title: "Another comparison" },
    ]);
    const address = await app.server.listen({ host: "127.0.0.1", port: 0 });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${address}/#/channels/${channel.channel_id}?tab=topics`);
    await page
      .locator("article.topic-card")
      .filter({ has: page.getByRole("heading", { name: "Speed comparison", exact: true }) })
      .getByRole("button", { name: "Create Short-Reel", exact: true })
      .click();
    await page.waitForURL(/short-reels\/sreel_/);
    await page.getByTestId("short-reel-source-question").waitFor();
    const url = page.url();
    const before = (await app.repository.listShortReels(channel.channel_id))[0];
    expect(before.source.question_text).toBe(repairSource.question_text);
    expect(before.source.selected_answer_text).toBe(repairSource.selected_answer_text);
    await page.reload();
    await page.getByTestId("short-reel-source-question").waitFor();
    expect(page.url()).toBe(url);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.getByRole("button", { name: "Retry loading Short-Reel" }).waitFor();
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.getByTestId("short-reel-source-question").waitFor();
    expect(await app.repository.listShortReels(channel.channel_id)).toHaveLength(1);
    expect(await app.repository.listEpisodes(channel.channel_id)).toHaveLength(0);
    expect(app.tasks.list()).toHaveLength(0);
    expect(errors).toEqual([]);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const box = await page.getByRole("heading", { name: "Speed comparison", exact: true }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  } finally {
    await browser.close();
    await app.close();
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  }
}, 60_000);
