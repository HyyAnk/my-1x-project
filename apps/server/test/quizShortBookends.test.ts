import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { QuizShortSchema, type QuizShort, type QuizShortBookendPair } from "@studio/shared";
import { buildApp, type StudioApp } from "../src/app.js";
import { createQuizShortId } from "../src/repository/quizShorts.js";
import { createQuizShortBookendDeps, resolveQuizShortBookends } from "../src/quizShortBookends/index.js";

const execFileAsync = promisify(execFile);
const PRESET = "preset_arcade_classic";
const OTHER_PRESET = "preset_cyber_neon";

async function makeVideo(target: string, size: string, seconds: number): Promise<string> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=blue:s=${size}:d=${seconds}`,
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=48000",
    "-t",
    String(seconds),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    target,
  ]);
  return `data:video/mp4;base64,${(await readFile(target)).toString("base64")}`;
}

describe("Short Intro & Outro pairs", () => {
  let app: StudioApp;
  let storage: string;
  let channelId: string;
  let introData: string;
  let outroData: string;
  let landscapeData: string;
  const base = () => `/api/channels/${channelId}/quiz-short-bookends`;

  async function upload(body: Record<string, unknown>) {
    return app.server.inject({ method: "POST", url: base(), payload: body });
  }

  async function saveQuizShort(stylePresetId: string, selection?: QuizShort["quiz_config"]["bookend_selection"]): Promise<QuizShort> {
    const now = new Date().toISOString();
    return app.repository.saveQuizShort(
      channelId,
      QuizShortSchema.parse({
        quiz_short_id: createQuizShortId(),
        channel_id: channelId,
        slug: `short-${randomUUID().slice(0, 8)}`,
        topic: { title: "Ocean animals", premise: "Five ocean facts", hook: "Who swims fastest?" },
        stage: "SCENE_READY",
        quiz_config: { style_preset_id: stylePresetId, ...(selection ? { bookend_selection: selection } : {}) },
        created_at: now,
        updated_at: now,
      }),
    );
  }

  beforeAll(async () => {
    let root = process.cwd();
    while (root !== path.dirname(root) && !existsSync(path.join(root, "pnpm-workspace.yaml"))) root = path.dirname(root);
    app = await buildApp(root);
    storage = await mkdtemp(path.join(os.tmpdir(), "short-bookends-test-"));
    await app.repository.setStorageRoot(storage);
    const channel = await app.repository.createChannel({
      name: "Short Bookend Lab",
      description: "",
      target_audience: "",
      language: "English",
      market: "Global",
      dna_mode: "example",
    });
    channelId = channel.channel_id;
    introData = await makeVideo(path.join(storage, "intro.mp4"), "1080x1920", 1.5);
    outroData = await makeVideo(path.join(storage, "outro.mp4"), "1080x1920", 1.2);
    landscapeData = await makeVideo(path.join(storage, "landscape.mp4"), "1920x1080", 1);
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await rm(storage, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it("stores a portrait pair with the intro always muted and the outro muted by default", async () => {
    const res = await upload({ pair_id: `spair_${randomUUID()}`, style_preset_id: PRESET, intro_data: introData, outro_data: outroData });
    expect(res.statusCode).toBe(201);
    const pair = res.json().pair as QuizShortBookendPair;
    expect(pair.name).toBe("001");
    expect(pair.intro).toMatchObject({ width: 1080, height: 1920, has_audio: false });
    expect(pair.outro.has_audio).toBe(false);
    expect(pair.title_canvas).toEqual({ x: 110, y: 280, width: 860, height: 900 });

    const clip = await app.server.inject({ method: "GET", url: `${base()}/${pair.pair_id}/clips/intro` });
    expect(clip.statusCode).toBe(200);
    expect(clip.headers["content-type"]).toBe("video/mp4");
  });

  it("keeps outro audio on request, numbers pairs per style and retries idempotently", async () => {
    const body = {
      pair_id: `spair_${randomUUID()}`,
      style_preset_id: PRESET,
      intro_data: introData,
      outro_data: outroData,
      outro_keep_audio: true,
    };
    const first = await upload(body);
    const retry = await upload(body);
    expect(first.statusCode).toBe(201);
    expect(retry.json().pair).toEqual(first.json().pair);
    expect(first.json().pair.outro.has_audio).toBe(true);
    expect(first.json().pair.name).toBe("002");
    const conflict = await upload({ ...body, outro_keep_audio: false });
    expect(conflict.statusCode).toBe(400);
    expect(conflict.json().error).toContain("already belongs to another pair");
  });

  it("rejects landscape media and unknown styles without leaving a pair behind", async () => {
    const pairId = `spair_${randomUUID()}`;
    const landscape = await upload({ pair_id: pairId, style_preset_id: PRESET, intro_data: landscapeData, outro_data: outroData });
    expect(landscape.statusCode).toBe(422);
    expect(landscape.json().error).toContain("portrait 1080x1920");
    const unknown = await upload({
      pair_id: `spair_${randomUUID()}`,
      style_preset_id: "nope",
      intro_data: introData,
      outro_data: outroData,
    });
    expect(unknown.statusCode).toBe(400);
    const list = await app.server.inject({ method: "GET", url: base() });
    expect((list.json().pairs as QuizShortBookendPair[]).some((pair) => pair.pair_id === pairId)).toBe(false);
  });

  it("summarizes ready pairs per built-in style and edits the title canvas", async () => {
    const categories = await app.server.inject({ method: "GET", url: `/api/channels/${channelId}/quiz-short-bookend-categories` });
    const arcade = categories.json().categories.find((category: { style_preset_id: string }) => category.style_preset_id === PRESET);
    expect(arcade).toMatchObject({ total_count: 2, ready_count: 2 });

    const [pair] = (await app.server.inject({ method: "GET", url: base() })).json().pairs as QuizShortBookendPair[];
    const canvas = { x: 100, y: 300, width: 880, height: 800 };
    const patched = await app.server.inject({ method: "PATCH", url: `${base()}/${pair.pair_id}`, payload: { title_canvas: canvas } });
    expect(patched.json().pair.title_canvas).toEqual(canvas);
    const outside = await app.server.inject({
      method: "PATCH",
      url: `${base()}/${pair.pair_id}`,
      payload: { title_canvas: { x: 600, y: 300, width: 880, height: 800 } },
    });
    expect(outside.statusCode).toBe(400);
  });

  it("pins a pair from the Short's style category and none when the category is empty or disabled", async () => {
    const deps = createQuizShortBookendDeps(app.repository);
    const matching = await resolveQuizShortBookends(deps, await saveQuizShort(PRESET));
    expect(matching?.pair.style_preset_id).toBe(PRESET);
    expect(matching?.snapshot.intro_duration_seconds).toBeCloseTo(1.5, 1);

    expect(await resolveQuizShortBookends(deps, await saveQuizShort(OTHER_PRESET))).toBeNull();
    expect(await resolveQuizShortBookends(deps, await saveQuizShort(PRESET, { mode: "none" }))).toBeNull();
  });

  it("rebuilds voice when a settings change removes the Short intro and outro", async () => {
    const quizShort = await saveQuizShort(PRESET);
    await resolveQuizShortBookends(createQuizShortBookendDeps(app.repository), quizShort);
    const res = await app.server.inject({
      method: "PATCH",
      url: `/api/channels/${channelId}/quiz-shorts/${quizShort.quiz_short_id}`,
      payload: { bookend_selection: { mode: "none" } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().quiz_config.bookend_selection).toEqual({ mode: "none" });
    const snapshot = await createQuizShortBookendDeps(app.repository).store.readSnapshot(channelId, quizShort.quiz_short_id);
    expect(snapshot?.pair_id).toBeNull();
  });

  it("deletes a pair", async () => {
    const [pair] = (await app.server.inject({ method: "GET", url: base() })).json().pairs as QuizShortBookendPair[];
    expect((await app.server.inject({ method: "DELETE", url: `${base()}/${pair.pair_id}` })).statusCode).toBe(200);
    const missing = await app.server.inject({ method: "GET", url: `${base()}/${pair.pair_id}/clips/intro` });
    expect(missing.statusCode).toBe(404);
  });
});
