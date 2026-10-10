import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { DEFAULT_CONFIG } from "../src/config.js";
import { ensureProductThumbnailNonBlocking } from "../src/quiz/pipeline/stages/productThumbnailStage.js";
import { readQuizShortCoverManifest } from "../src/quiz/thumbnail/quizShortCoverManifest.js";
import { generateQuizShortCover, generateQuizShortCoverForProduct } from "../src/quiz/thumbnail/quizShortCoverService.js";
import {
  createQuizShortMetadataFixture,
  failingCoverClient,
  fakeCoverClient,
  portraitPng,
  type QuizShortMetadataFixture,
} from "./fixtures/quizShortMetadataFixture.js";

const fixtures: QuizShortMetadataFixture[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(fixtures.splice(0).map((fixture) => fixture.cleanup()));
});

async function fixture(): Promise<QuizShortMetadataFixture> {
  const created = await createQuizShortMetadataFixture();
  fixtures.push(created);
  return created;
}

describe("Quiz Short cover service", () => {
  it("normalizes the provider image to 1080x1920 PNG, stores it under assets and records it on the record", async () => {
    const f = await fixture();
    const client = fakeCoverClient(await portraitPng("blue", 720, 1280));

    const { manifest, reused } = await generateQuizShortCover({ ...f, portraitImageClient: client });

    expect(reused).toBe(false);
    expect(manifest.asset_path).toBe(`channels/${f.channel.slug}/quiz_shorts/${f.quizShort.slug}/assets/cover.png`);
    expect(manifest).toMatchObject({ width: 1080, height: 1920, badge_text: "5 QUESTIONS", provider: "test" });
    const meta = await sharp(await readFile(f.repository.resolveContextPath(manifest.asset_path))).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1080, 1920, "png"]);
    const record = await f.repository.getQuizShort(f.channelId, f.quizShortId);
    expect(record.thumbnail_asset_path_9_16).toBe(manifest.asset_path);
    expect(await readQuizShortCoverManifest(f.repository, f.channelId, f.quizShortId)).toEqual(manifest);
  });

  it("sends a 9:16 request whose prompt never contains the correct answer", async () => {
    const f = await fixture();
    const client = fakeCoverClient(await portraitPng("blue"));
    await generateQuizShortCover({ ...f, portraitImageClient: client });

    const request = client.generate.mock.calls[0][0] as { prompt: string; aspectRatio: string; reference: { bytes: Uint8Array } };
    expect(request.aspectRatio).toBe("9:16");
    expect(request.reference.bytes.length).toBeGreaterThan(0);
    expect(request.prompt).toContain('Never show, write or hint at the correct answer "Jupiter"');
    expect(request.prompt).toContain('"5 QUESTIONS"');
  });

  it("reuses an up-to-date cover on rerun and regenerates when the questions change or force is set", async () => {
    const f = await fixture();
    const client = fakeCoverClient(await portraitPng("blue"));
    const first = await generateQuizShortCover({ ...f, portraitImageClient: client });

    const second = await generateQuizShortCover({ ...f, portraitImageClient: client });
    expect(second.reused).toBe(true);
    expect(second.manifest).toEqual(first.manifest);
    expect(client.generate).toHaveBeenCalledTimes(1);

    const changedQuiz = {
      ...f.quiz,
      questions: f.quiz.questions.map((q, i) => (i === 0 ? { ...q, question: "Which planet is the hottest?" } : q)),
    };
    const third = await generateQuizShortCover({ ...f, quiz: changedQuiz, portraitImageClient: client });
    expect(third.reused).toBe(false);
    expect(client.generate).toHaveBeenCalledTimes(2);

    const forced = await generateQuizShortCover({ ...f, quiz: changedQuiz, portraitImageClient: client, force: true });
    expect(forced.reused).toBe(false);
    expect(client.generate).toHaveBeenCalledTimes(3);
  });

  it("rejects landscape provider output and leaves the record untouched", async () => {
    const f = await fixture();
    const client = fakeCoverClient(await portraitPng("red", 1280, 720));

    await expect(generateQuizShortCover({ ...f, portraitImageClient: client })).rejects.toThrow(/portrait orientation/);
    expect((await f.repository.getQuizShort(f.channelId, f.quizShortId)).thumbnail_asset_path_9_16).toBeNull();
    expect(await readQuizShortCoverManifest(f.repository, f.channelId, f.quizShortId)).toBeNull();
  });

  it("loads channel, record and quiz by id", async () => {
    const f = await fixture();
    const client = fakeCoverClient(await portraitPng("green"));
    const result = await generateQuizShortCoverForProduct({
      repository: f.repository,
      channelId: f.channelId,
      quizShortId: f.quizShortId,
      portraitImageClient: client,
    });
    expect(result.manifest.hook_text.length).toBeGreaterThan(0);
  });

  it("keeps the pipeline running when the cover provider fails", async () => {
    const f = await fixture();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      ensureProductThumbnailNonBlocking({
        repository: f.repository,
        config: { audio_generation: DEFAULT_CONFIG.audio_generation },
        channelId: f.channelId,
        episodeId: f.quizShortId,
        product: f.ref,
        portraitImageClient: failingCoverClient("Provider unavailable"),
      }),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(`Thumbnail skipped for quiz_short "${f.quizShortId}"`),
      expect.stringContaining("Provider unavailable"),
    );
    expect((await f.repository.getQuizShort(f.channelId, f.quizShortId)).thumbnail_asset_path_9_16).toBeNull();
  });
});
