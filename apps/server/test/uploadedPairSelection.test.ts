import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomInt } from "node:crypto";
import { pinIntroOutroSelection, resolveEpisodeIntroOutro } from "../src/quiz/introOutro/episodeSelection.js";
import { resolveAndCopyIntroOutro } from "../src/tasks/video/introOutroMediaResolver.js";
import { resolveIntroOutroConfig } from "../src/quiz/pipeline/stages/assetsVoiceStages.js";
import { uploadedPairFixture } from "./fixtures/uploadedPairFixture.js";

vi.mock("node:crypto", async (original) => ({ ...(await original<typeof import("node:crypto")>()), randomInt: vi.fn(() => 0) }));

describe("Durable uploaded pair selection", () => {
  let fixture: Awaited<ReturnType<typeof uploadedPairFixture>>;
  beforeAll(async () => {
    fixture = await uploadedPairFixture();
  });
  afterAll(async () => {
    await rm(fixture.root, { recursive: true, force: true });
  });

  it("pins empty categories without using the legacy default or later uploads", async () => {
    const { repository, channel, episode, addPair } = fixture;
    await addPair("unrelated", "unrelated-category");
    channel.default_intro_outro_style_id = "unrelated";
    const value = episode("empty");
    const first = await pinIntroOutroSelection(repository, channel, value);
    expect(first.pair_id).toBeNull();
    await addPair("a");
    await addPair("b");
    expect(await pinIntroOutroSelection(repository, channel, episode("empty"))).toEqual(first);
  });

  it("falls back to uncategorized channel default pair when category has no matching candidates", async () => {
    const { repository, channel, episode, addPair } = fixture;
    await addPair("legacy-uncategorized", null);
    channel.default_intro_outro_style_id = "legacy-uncategorized";
    const value = episode("empty-with-legacy-default");
    value.quiz_config.style_preset_id = "preset_treasure_quest";
    const snapshot = await pinIntroOutroSelection(repository, channel, value);
    expect(snapshot.pair_id).toBe("legacy-uncategorized");
  });

  it("draws independently, allows repeats, and uses measured media duration", async () => {
    const { repository, channel, episode } = fixture;
    const random = vi.mocked(randomInt);
    random.mockClear();
    random.mockReturnValueOnce(0).mockReturnValueOnce(1).mockReturnValueOnce(0);
    const results = await Promise.all(["first", "second", "third"].map((id) => pinIntroOutroSelection(repository, channel, episode(id))));
    expect(results.map((item) => item.pair_id).sort()).toEqual(["a", "a", "b"]);
    expect(random).toHaveBeenCalledTimes(3);
    expect(results[0].intro_duration_seconds).toBeCloseTo(0.6, 2);
    expect(results[0].outro_duration_seconds).toBeCloseTo(0.6, 2);
  });

  it("pins once for concurrent stages and survives retries from disk", async () => {
    const { repository, channel, episode } = fixture;
    vi.mocked(randomInt).mockClear();
    const results = await Promise.all(Array.from({ length: 4 }, () => pinIntroOutroSelection(repository, channel, episode("concurrent"))));
    expect(new Set(results.map((item) => item.pair_id)).size).toBe(1);
    expect(randomInt).toHaveBeenCalledTimes(1);
    const retry = episode("concurrent");
    retry.quiz_config.resolved_visual_style = "flat_vector";
    expect(await pinIntroOutroSelection(repository, channel, retry, true)).toEqual(results[0]);
    expect(randomInt).toHaveBeenCalledTimes(1);
  });

  it("respects none and explicit pair without random draws, ignoring legacy settings", async () => {
    const { repository, channel, episode } = fixture;
    vi.mocked(randomInt).mockClear();
    const none = episode("none");
    none.quiz_config.intro_outro_selection = { mode: "none" };
    expect((await pinIntroOutroSelection(repository, channel, none)).pair_id).toBeNull();
    const specific = episode("specific");
    specific.quiz_config.intro_outro_selection = { mode: "specific_pair", style_id: "a" };
    specific.quiz_config.intro_outro_style_id = "none";
    expect((await pinIntroOutroSelection(repository, channel, specific)).pair_id).toBe("a");
    expect(randomInt).not.toHaveBeenCalled();
  });

  it("copies pinned media, forces source audio policy, and suppresses TTS even for silent clips", async () => {
    const { repository, channel, episode } = fixture;
    const value = episode("voice");
    await pinIntroOutroSelection(repository, channel, value);
    await repository.writeJsonAtomic(repository.resolvePath("channels", channel.slug, "episodes", value.slug, "episode.json"), value);
    const config = await resolveIntroOutroConfig(repository, channel.channel_id, value.episode_id);
    expect(config).toMatchObject({ skipIntro: true, skipOutro: true, introDuration: 0.6, outroDuration: 0.6 });
    const renderRoot = path.join(fixture.root, "render");
    await mkdir(renderRoot);
    const result = await resolveAndCopyIntroOutro(repository, channel, value, renderRoot, "retry-job");
    expect(result).toMatchObject({ audioMode: "use_video_audio", introHasAudio: false, outroHasAudio: false });
    expect((await readFile(path.join(renderRoot, "intro.mp4"))).length).toBeGreaterThan(0);
  });

  it("toggles intro and outro independently without re-rolling the pinned pair", async () => {
    const { repository, channel, episode } = fixture;
    const value = episode("bookend-toggles");
    const pinned = await pinIntroOutroSelection(repository, channel, value);
    vi.mocked(randomInt).mockClear();
    value.quiz_config.intro_enabled = false;
    const introOff = await resolveEpisodeIntroOutro(repository, channel, value);
    expect(introOff.snapshot).toMatchObject({ pair_id: pinned.pair_id, intro_duration_seconds: 0 });
    expect(introOff.snapshot.outro_duration_seconds).toBeCloseTo(0.6, 2);
    expect(randomInt).not.toHaveBeenCalled();

    const renderRoot = path.join(fixture.root, "render-bookend-toggles");
    await mkdir(renderRoot);
    const introOffMedia = await resolveAndCopyIntroOutro(repository, channel, value, renderRoot, "toggle-job");
    expect(introOffMedia.introVideoPath).toBeUndefined();
    expect(introOffMedia.outroVideoPath).toBeDefined();

    value.quiz_config.intro_enabled = true;
    value.quiz_config.outro_enabled = false;
    const outroOffMedia = await resolveAndCopyIntroOutro(repository, channel, value, renderRoot, "toggle-job");
    expect(outroOffMedia.introVideoPath).toBeDefined();
    expect(outroOffMedia.outroVideoPath).toBeUndefined();
    expect(outroOffMedia.selectionFingerprint).not.toBe(introOffMedia.selectionFingerprint);
  });

  it("rejects changed or missing pinned media instead of selecting another pair", async () => {
    const { repository, channel, episode, addPair } = fixture;
    await addPair("changed");
    const value = episode("changed");
    value.quiz_config.intro_outro_selection = { mode: "specific_pair", style_id: "changed" };
    await pinIntroOutroSelection(repository, channel, value);
    const file = await repository.getIntroOutroClipPath(channel.channel_id, "changed", "intro");
    await writeFile(file, "changed media");
    await expect(resolveEpisodeIntroOutro(repository, channel, value)).rejects.toMatchObject({ code: "INTRO_OUTRO_PAIR_CHANGED" });
    await rm(file);
    await expect(resolveEpisodeIntroOutro(repository, channel, value)).rejects.toMatchObject({ code: "INTRO_OUTRO_PAIR_UNAVAILABLE" });
  });
});
