import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import {
  DEFAULT_BGM_BASE_VOLUME,
  defaultBgmRegistry,
  BgmRegistry,
} from "../src/quiz/audio/bgmRegistry.js";
import {
  DEFAULT_DUCKING_ATTACK_MS,
  DEFAULT_DUCKING_RATIO,
  DEFAULT_DUCKING_RELEASE_MS,
  DEFAULT_DUCKING_THRESHOLD,
  buildFilterGraphScript,
  type MasterSoundtrackPlan,
} from "../src/quiz/audio/soundtrackFfmpegBuilder.js";
import {
  defaultBgmCandidateDirectories,
  mixMasterSoundtrack,
  resolveBgmScheduleItems,
} from "../src/quiz/audio/soundtrackMixer.js";
import { createSilenceWav } from "../src/quiz/audio/voiceSynthesis.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";

const execFileAsync = promisify(execFile);

function createPcmToneWav(durationSeconds: number, frequency = 440, amplitude = 0.5): Uint8Array {
  const sampleRate = 48000;
  const numSamples = Math.max(0, Math.round(durationSeconds * sampleRate));
  const dataSize = numSamples * 4;
  const buffer = new Uint8Array(44 + dataSize);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  buffer[0] = 0x52; // "RIFF"
  buffer[1] = 0x49;
  buffer[2] = 0x46;
  buffer[3] = 0x46;
  view.setUint32(4, 36 + dataSize, true);
  buffer[8] = 0x57; // "WAVE"
  buffer[9] = 0x41;
  buffer[10] = 0x56;
  buffer[11] = 0x45;
  buffer[12] = 0x66; // "fmt "
  buffer[13] = 0x6d;
  buffer[14] = 0x74;
  buffer[15] = 0x20;
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 2, true); // stereo
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  buffer[36] = 0x64; // "data"
  buffer[37] = 0x61;
  buffer[38] = 0x74;
  buffer[39] = 0x61;
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const angle = (2 * Math.PI * frequency * i) / sampleRate;
    const sample = Math.round(Math.sin(angle) * amplitude * 32767);
    const clamped = Math.max(-32768, Math.min(32767, sample));
    view.setInt16(44 + i * 4, clamped, true);
    view.setInt16(44 + i * 4 + 2, clamped, true);
  }

  return buffer;
}

function measureRmsRange(buffer: Uint8Array, startSeconds: number, endSeconds: number): number {
  const sampleRate = 48000;
  const channels = 2;
  const bytesPerSample = 2;
  const frameSize = channels * bytesPerSample;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const startFrame = Math.floor(startSeconds * sampleRate);
  const endFrame = Math.min(Math.floor((buffer.byteLength - 44) / frameSize), Math.floor(endSeconds * sampleRate));

  let sumSquares = 0;
  let count = 0;
  for (let f = startFrame; f < endFrame; f++) {
    for (let c = 0; c < channels; c++) {
      const sample = view.getInt16(44 + f * frameSize + c * bytesPerSample, true) / 32768;
      sumSquares += sample * sample;
      count++;
    }
  }

  return Math.sqrt(sumSquares / Math.max(1, count));
}

describe("Soundtrack Ducking Engine", () => {
  it("uses professional broadcast BGM base volume of 0.09", () => {
    expect(DEFAULT_BGM_BASE_VOLUME).toBe(0.09);

    const registry = new BgmRegistry();
    const schedule = registry.resolveBgmSchedule(120);
    expect(schedule[0]?.volume).toBe(0.09);

    const defaultSchedule = defaultBgmRegistry.resolveBgmSchedule(60);
    expect(defaultSchedule[0]?.volume).toBe(0.09);
  });

  it("exports calibrated default ducking parameters matching broadcast standards", () => {
    expect(DEFAULT_DUCKING_THRESHOLD).toBe(0.04);
    expect(DEFAULT_DUCKING_RATIO).toBe(10);
    expect(DEFAULT_DUCKING_ATTACK_MS).toBe(80);
    expect(DEFAULT_DUCKING_RELEASE_MS).toBe(450);
  });

  it("generates correct sidechain compression filter graph with defaults", () => {
    const plan: MasterSoundtrackPlan = {
      durationSeconds: 10,
      narrationPath: "speech.wav",
      ducking: true,
      bgmItems: [
        {
          id: "bgm-test",
          trackId: "track_test",
          filename: "music.mp3",
          filePath: "D:/music.mp3",
          startSeconds: 0,
          durationSeconds: 10,
          volume: 0.09,
          fadeInSeconds: 0.5,
          fadeOutSeconds: 1.0,
        },
      ],
      sfxItems: [],
    };

    const inputIndices = new Map<string, number>([
      ["speech.wav", 0],
      ["D:/music.mp3", 1],
    ]);

    const script = buildFilterGraphScript(plan, inputIndices);
    expect(script).toContain(
      "sidechaincompress=threshold=0.04:ratio=10:attack=80:release=450:makeup=1[bgm_ducked];",
    );
    expect(script).toContain("volume=1.0");
    expect(script).toContain("volume=0.09");
  });

  it("measurably attenuates BGM during speech using real FFmpeg sidechain compression", async () => {
    let ffmpegAvailable = true;
    try {
      await execFileAsync("ffmpeg", ["-version"]);
    } catch {
      ffmpegAvailable = false;
    }
    if (!ffmpegAvailable) return;

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "ducking-test-"));
    try {
      // Narration: 0-3s loud tone (speech active), 3-6s silence (speech paused)
      const speechTone = createPcmToneWav(3, 440, 0.7);
      const speechSilence = createSilenceWav(3);
      const speechCombined = new Uint8Array(44 + (speechTone.length - 44) + (speechSilence.length - 44));
      speechCombined.set(speechTone, 0);
      speechCombined.set(speechSilence.subarray(44), speechTone.length);
      const view = new DataView(speechCombined.buffer, speechCombined.byteOffset, speechCombined.byteLength);
      const totalDataSize = speechCombined.length - 44;
      view.setUint32(4, 36 + totalDataSize, true);
      view.setUint32(40, totalDataSize, true);

      const narrationPath = path.join(tmpDir, "speech.wav");
      await writeFile(narrationPath, speechCombined);

      // BGM: 6 seconds continuous tone at base volume 0.09
      const bgmWav = createPcmToneWav(6, 220, 0.09);
      const bgmPath = path.join(tmpDir, "bgm.wav");
      await writeFile(bgmPath, bgmWav);

      // Render isolated ducked BGM using sidechaincompress filter
      const duckedOutputPath = path.join(tmpDir, "ducked_bgm.wav");
      const filterScript = [
        "[0:a]aformat=sample_rates=48000:channel_layouts=stereo[sidechain];",
        "[1:a]aformat=sample_rates=48000:channel_layouts=stereo[bgm_in];",
        `[bgm_in][sidechain]sidechaincompress=threshold=${DEFAULT_DUCKING_THRESHOLD}:ratio=${DEFAULT_DUCKING_RATIO}:attack=${DEFAULT_DUCKING_ATTACK_MS}:release=${DEFAULT_DUCKING_RELEASE_MS}:makeup=1[out]`,
      ].join("\n");

      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        narrationPath,
        "-i",
        bgmPath,
        "-filter_complex",
        filterScript,
        "-map",
        "[out]",
        "-c:a",
        "pcm_s16le",
        duckedOutputPath,
      ]);

      const duckedBuffer = await readFile(duckedOutputPath);
      const duckedRms = measureRmsRange(duckedBuffer, 1.0, 2.5); // While speech is active
      const unDuckedRms = measureRmsRange(duckedBuffer, 4.5, 5.5); // After speech stops and compressor releases

      expect(duckedRms).toBeGreaterThan(0);
      expect(unDuckedRms).toBeGreaterThan(0);

      // Verify ducked section is measurably lower than un-ducked section
      // Ratio 10 threshold 0.04 should reduce BGM by at least 6-12 dB (RMS ratio < 0.45)
      const rmsRatio = duckedRms / unDuckedRms;
      expect(rmsRatio).toBeLessThan(0.45);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("mixes full master soundtrack cleanly with balanced BGM ducking and 0 clipping", async () => {
    let ffmpegAvailable = true;
    try {
      await execFileAsync("ffmpeg", ["-version"]);
    } catch {
      ffmpegAvailable = false;
    }
    if (!ffmpegAvailable) return;

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "soundtrack-ducking-mix-"));
    try {
      const tracksDir = path.join(tmpDir, "tracks");
      await mkdir(tracksDir, { recursive: true });
      const dummyBgm = createPcmToneWav(60, 200, 0.09);
      await writeFile(path.join(tracksDir, "Games_in_the_Garden.mp3"), dummyBgm);

      const dummyQuiz = QuizV2Schema.parse({
        schema_version: 2,
        episode_id: "ducking-mix-test",
        age_band: "7-9",
        language: "English",
        questions: [
          {
            id: "q1",
            number: 1,
            format: "multiple_choice",
            difficulty: 1,
            question: "Is ducking active?",
            choices: [
              { id: "c1", text: "Yes" },
              { id: "c2", text: "No" },
              { id: "c3", text: "Maybe" },
            ],
            correct_choice_id: "c1",
            explanation: "Ducking attenuates BGM during speech.",
            fun_fact: "Broadcasters use sidechain compression.",
            source_ids: ["S1"],
            visual_opportunity: "Microphone icon",
            validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
          },
        ],
      });

      const director = createDefaultDirectorPlan(dummyQuiz);
      const timeline = compileQuizTimeline({
        quiz: dummyQuiz,
        director,
        voicePlan: buildQuizVoicePlan(dummyQuiz),
      });

      const narrationWav = createPcmToneWav(10, 440, 0.6);
      const narrationPath = path.join(tmpDir, "narration.wav");
      await writeFile(narrationPath, narrationWav);

      const outputPath = path.join(tmpDir, "master_output.wav");
      const result = await mixMasterSoundtrack({
        narrationPath,
        timeline,
        durationSeconds: 10,
        workingDirectory: tmpDir,
        outputPath,
        ducking: true,
        loudnorm: true,
        bgmCandidateDirectories: [tmpDir, tracksDir, ...defaultBgmCandidateDirectories()],
        bgmOptions: {
          bpmPreference: "120_bpm_upbeat",
          seed: "ducking-test",
          trackId: "Games_in_the_Garden",
        },
      });

      expect(result.outputPath).toBe(outputPath);
      expect(result.diagnostics?.ok).toBe(true);
      expect(result.diagnostics?.clipping_samples).toBe(0);
      expect(result.diagnostics?.sample_rate).toBe(48000);
      expect(result.diagnostics?.channels).toBe(2);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
