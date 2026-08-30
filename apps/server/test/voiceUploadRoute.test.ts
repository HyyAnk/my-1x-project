import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function createWavBuffer(dataByteLength = 100): Buffer {
  const buffer = Buffer.alloc(44 + dataByteLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataByteLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(24000, 24); // sample rate
  buffer.writeUInt32LE(48000, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataByteLength, 40);
  return buffer;
}

describe("Voice upload and management routes", () => {
  it("includes built-in English Girl voice by default and protects it from deletion", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "voice-builtin-route-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await mkdir(path.join(root, "assets", "audio", "voices", "english_girl"), { recursive: true });
    await Promise.all([
      writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
      writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
      writeFile(path.join(root, "assets", "audio", "voices", "english_girl", "sample.wav"), createWavBuffer(200)),
      writeFile(path.join(root, "assets", "audio", "voices", "english_girl", "reference.wav"), createWavBuffer(500)),
    ]);

    const app = await buildApp(root);
    try {
      // 1. List voices has built-in voice
      const listRes = await app.server.inject({ method: "GET", url: "/api/voices" });
      expect(listRes.statusCode).toBe(200);
      const voices = listRes.json().voices;
      expect(voices.length).toBeGreaterThanOrEqual(1);
      const builtin = voices.find((v: { voice_id: string }) => v.voice_id === "voice_builtin_english_girl");
      expect(builtin).toMatchObject({
        voice_id: "voice_builtin_english_girl",
        name: "Voice English girl",
        is_builtin: true,
      });

      // 2. Stream built-in voice sample
      const sampleRes = await app.server.inject({ method: "GET", url: "/api/voices/voice_builtin_english_girl/sample" });
      expect(sampleRes.statusCode).toBe(200);
      expect(sampleRes.headers["content-type"]).toBe("audio/wav");

      // 3. Attempting to delete built-in voice throws error
      const deleteRes = await app.server.inject({ method: "DELETE", url: "/api/voices/voice_builtin_english_girl" });
      expect(deleteRes.statusCode).toBe(400);
      expect(deleteRes.json().error).toContain("Cannot delete built-in system voice");
    } finally {
      await app.close();
    }
  }, 20000);

  it("allows uploading a voice WAV file and creates a profile even when Chatterbox is offline", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "voice-upload-route-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await Promise.all([
      writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
      writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
    ]);

    const app = await buildApp(root);
    try {
      const wav = createWavBuffer(500);
      const base64Audio = wav.toString("base64");

      // 1. Upload custom voice
      const res = await app.server.inject({
        method: "POST",
        url: "/api/voices",
        payload: {
          name: "Deep Narrator",
          data: base64Audio,
        },
      });

      expect(res.statusCode).toBe(200);
      const voice = res.json();
      expect(voice).toMatchObject({
        voice_id: expect.stringMatching(/^voice_/),
        name: "Deep Narrator",
        reference_path: expect.stringContaining("reference.wav"),
        sample_path: expect.stringContaining("sample.wav"),
      });

      // 2. List voices (contains built-in default + newly uploaded voice)
      const listRes = await app.server.inject({ method: "GET", url: "/api/voices" });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().voices.length).toBeGreaterThanOrEqual(2);
      expect(listRes.json().voices.some((v: { voice_id: string }) => v.voice_id === voice.voice_id)).toBe(true);

      // 3. Get voice sample audio
      const sampleRes = await app.server.inject({ method: "GET", url: `/api/voices/${voice.voice_id}/sample` });
      expect(sampleRes.statusCode).toBe(200);
      expect(sampleRes.headers["content-type"]).toBe("audio/wav");
      expect(sampleRes.rawPayload.length).toBe(wav.length);

      // 4. Assign voice to channel
      const channel = await app.repository.createChannel({
        name: "Voice Test Channel",
        description: "",
        target_audience: "",
        language: "English",
        market: "",
        dna_mode: "example",
      });

      const assignRes = await app.server.inject({
        method: "PUT",
        url: `/api/channels/${channel.channel_id}/voice`,
        payload: { voice_id: voice.voice_id },
      });
      expect(assignRes.statusCode).toBe(200);
      expect(assignRes.json().voice_reference_path).toBe(voice.reference_path);
    } finally {
      await app.close();
    }
  }, 20000);

  it("accepts WAV payloads larger than 1MB without 413 Payload Too Large error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "voice-upload-large-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await Promise.all([
      writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
      writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
    ]);

    const app = await buildApp(root);
    try {
      // Create a ~2MB WAV file (base64 string will be ~2.7MB, well above default 1MB Fastify limit)
      const largeWav = createWavBuffer(2 * 1024 * 1024);
      const base64Audio = largeWav.toString("base64");

      const res = await app.server.inject({
        method: "POST",
        url: "/api/voices",
        payload: {
          name: "Large Voice Sample",
          data: base64Audio,
        },
      });

      expect(res.statusCode).toBe(200);
      const voice = res.json();
      expect(voice.name).toBe("Large Voice Sample");

      // Verify the uploaded reference binary length on disk matches the 2MB WAV file
      const referenceOnDisk = await readFile(app.repository.resolveContextPath(voice.reference_path));
      expect(referenceOnDisk.length).toBe(largeWav.length);

      // Verify the sample endpoint returns 200 and audio/wav content (either generated preview or reference)
      const sampleRes = await app.server.inject({ method: "GET", url: `/api/voices/${voice.voice_id}/sample` });
      expect(sampleRes.statusCode).toBe(200);
      expect(sampleRes.headers["content-type"]).toBe("audio/wav");
      expect(sampleRes.rawPayload.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  }, 20000);

  it("rejects non-WAV data with INVALID_AUDIO error", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "voice-upload-invalid-"));
    roots.push(root);
    await mkdir(path.join(root, "templates"), { recursive: true });
    await Promise.all([
      writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8"),
      writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8"),
    ]);

    const app = await buildApp(root);
    try {
      const invalidData = Buffer.from("NOT_A_VALID_WAV_FILE_HEADER").toString("base64");

      const res = await app.server.inject({
        method: "POST",
        url: "/api/voices",
        payload: {
          name: "Corrupt Voice",
          data: invalidData,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("Voice reference must be a WAV file");
    } finally {
      await app.close();
    }
  }, 20000);
});
