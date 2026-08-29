import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { QuizV2Schema } from "@studio/shared";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { createSilenceWav } from "../src/quiz/audio/voiceSynthesis.js";
import {
  buildFilterGraphScript,
  defaultBgmCandidateDirectories,
  defaultSfxCandidateDirectories,
  mixMasterSoundtrack,
  resolveBgmScheduleItems,
  resolveSfxSchedule,
  type MasterSoundtrackPlan,
} from "../src/quiz/audio/soundtrackMixer.js";
import { analyzeWavAudio, diagnoseMasterSoundtrack } from "../src/quiz/audio/audioDiagnostics.js";

const sampleQuiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "soundtrack-test",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "What is the capital of France?",
      choices: [
        { id: "c1", text: "Paris" },
        { id: "c2", text: "Rome" },
        { id: "c3", text: "Berlin" },
      ],
      correct_choice_id: "c1",
      explanation: "Paris is the capital of France.",
      fun_fact: "The Eiffel Tower is in Paris!",
      source_ids: ["S1"],
      visual_opportunity: "Eiffel tower illustration",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "q2",
      number: 2,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which animal says meow?",
      choices: [
        { id: "c1", text: "Dog" },
        { id: "c2", text: "Cat" },
        { id: "c3", text: "Cow" },
      ],
      correct_choice_id: "c2",
      explanation: "Cats make meow sounds.",
      fun_fact: "Cats have sharp hearing!",
      source_ids: ["S2"],
      visual_opportunity: "Playful cat cartoon",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

describe("Master Soundtrack Mixer", () => {
  it("resolves SFX schedule with correct timing and overlap clamping", () => {
    const director = createDefaultDirectorPlan(sampleQuiz);
    const timeline = compileQuizTimeline({ quiz: sampleQuiz, director, voicePlan: buildQuizVoicePlan(sampleQuiz) });
    const sfxCandidateDirs = defaultSfxCandidateDirectories();

    const sfxItems = resolveSfxSchedule(timeline.events, sfxCandidateDirs);
    expect(sfxItems.length).toBeGreaterThanOrEqual(4);

    // Verify SFX items have valid start, duration, volume and file paths
    for (const item of sfxItems) {
      expect(item.startSeconds).toBeGreaterThanOrEqual(0);
      expect(item.durationSeconds).toBeGreaterThan(0);
      expect(item.volume).toBeGreaterThan(0);
      expect(item.filePath).toBeTruthy();
      expect(item.filename).toMatch(/\.wav$/);
    }
  });

  it("resolves BGM schedule with fades and candidate file paths", () => {
    const bgmCandidateDirs = defaultBgmCandidateDirectories();
    const bgmItems = resolveBgmScheduleItems(60, bgmCandidateDirs, {
      bpmPreference: "120_bpm_upbeat",
      seed: "soundtrack-test",
    });

    expect(bgmItems.length).toBe(1);
    expect(bgmItems[0].startSeconds).toBe(0);
    expect(bgmItems[0].durationSeconds).toBeCloseTo(60, 1);
    expect(bgmItems[0].fadeInSeconds).toBeGreaterThanOrEqual(0.05);
    expect(bgmItems[0].fadeOutSeconds).toBeGreaterThanOrEqual(0.5);
    expect(bgmItems[0].filePath).toBeTruthy();
  });

  it("builds clean FFmpeg filtergraph script with dynamic ducking and loudnorm", () => {
    const plan: MasterSoundtrackPlan = {
      durationSeconds: 15,
      narrationPath: "narration.wav",
      ducking: true,
      duckingThreshold: 0.08,
      duckingRatio: 4,
      loudnorm: true,
      targetLufs: -14,
      bgmItems: [
        {
          id: "bgm-1",
          trackId: "track_1",
          filename: "bgm.mp3",
          filePath: "D:/music/bgm.mp3",
          startSeconds: 0,
          durationSeconds: 15,
          volume: 0.18,
          fadeInSeconds: 0.5,
          fadeOutSeconds: 2.0,
        },
      ],
      sfxItems: [
        {
          id: "sfx-1",
          intent: "countdown_tick",
          filename: "tick.wav",
          filePath: "D:/sfx/tick.wav",
          startSeconds: 3.0,
          durationSeconds: 0.08,
          volume: 0.45,
        },
        {
          id: "sfx-2",
          intent: "countdown_tick",
          filename: "tick.wav",
          filePath: "D:/sfx/tick.wav",
          startSeconds: 4.0,
          durationSeconds: 0.08,
          volume: 0.45,
        },
      ],
    };

    const inputIndices = new Map<string, number>([
      ["narration.wav", 0],
      ["D:/music/bgm.mp3", 1],
      ["D:/sfx/tick.wav", 2],
    ]);

    const script = buildFilterGraphScript(plan, inputIndices);

    // Verify asplit was generated for input 2 (used twice)
    expect(script).toContain("[2:a]asplit=2[in_2_0][in_2_1];");
    // Verify narration line with sidechain split
    expect(script).toContain("[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0,asplit=2[narr_stream][narr_sidechain];");
    // Verify sidechain compression
    expect(script).toContain("sidechaincompress=threshold=0.08:ratio=4:attack=100:release=400:makeup=1[bgm_ducked];");
    // Verify SFX delay lines
    expect(script).toContain("adelay=3000|3000");
    expect(script).toContain("adelay=4000|4000");
    // Verify loudnorm filter
    expect(script).toContain("loudnorm=I=-14:TP=-1:LRA=7");
    expect(script).toContain("[out_master]");
  });

  it("mixes real master soundtrack WAV using FFmpeg with ducking, loudnorm, and diagnostics", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "soundtrack-test-"));
    try {
      const director = createDefaultDirectorPlan(sampleQuiz);
      const timeline = compileQuizTimeline({ quiz: sampleQuiz, director, voicePlan: buildQuizVoicePlan(sampleQuiz) });

      // Create a 10s synthetic narration WAV
      const duration = 10;
      const narrationWav = createSilenceWav(duration);
      const narrationPath = path.join(tmpDir, "narration.wav");
      await writeFile(narrationPath, narrationWav);

      const outputPath = path.join(tmpDir, "soundtrack.wav");

      const result = await mixMasterSoundtrack({
        narrationPath,
        timeline,
        durationSeconds: duration,
        workingDirectory: tmpDir,
        outputPath,
        ducking: true,
        loudnorm: true,
        targetLufs: -14,
        bgmOptions: {
          bpmPreference: "120_bpm_upbeat",
          seed: "mix-test",
        },
      });

      expect(result.outputPath).toBe(outputPath);
      expect(result.durationSeconds).toBeCloseTo(duration, 0.1);
      expect(result.diagnostics).toBeTruthy();
      expect(result.diagnostics?.ok).toBe(true);
      expect(result.diagnostics?.clipping_samples).toBe(0);

      // Verify audio format is 48kHz stereo 16-bit PCM
      const outputBuffer = await import("node:fs/promises").then((m) => m.readFile(outputPath));
      const diagnostics = diagnoseMasterSoundtrack(new Uint8Array(outputBuffer), duration);
      expect(diagnostics.ok).toBe(true);
      expect(diagnostics.sample_rate).toBe(48000);
      expect(diagnostics.channels).toBe(2);
      expect(diagnostics.duration_seconds).toBeCloseTo(duration, 0.1);
      expect(diagnostics.clipping_samples).toBe(0);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("calculates deterministic soundtrack fingerprints sensitive to audio inputs and options", async () => {
    const { soundtrackFingerprint } = await import("../src/tasks/fingerprints.js");
    const { readSoundtrackCheckpoint, writeSoundtrackCheckpoint } = await import("../src/tasks/checkpoints.js");

    const events = [{ type: "countdown.tick", at_seconds: 3.5, payload: { value: 3 } }];
    const fp1 = soundtrackFingerprint("2026-08-30T00:00:00Z", 500000, events, "track_a", ["track_b"]);
    const fp2 = soundtrackFingerprint("2026-08-30T00:00:00Z", 500000, events, "track_a", ["track_b"]);
    const fpDifferentVoice = soundtrackFingerprint("2026-08-30T00:05:00Z", 500000, events, "track_a", ["track_b"]);
    const fpDifferentBgm = soundtrackFingerprint("2026-08-30T00:00:00Z", 500000, events, "track_c", ["track_b"]);

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fpDifferentVoice);
    expect(fp1).not.toBe(fpDifferentBgm);

    // Test reading and writing soundtrack checkpoint
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "soundtrack-cp-test-"));
    try {
      const cpPath = path.join(tmpDir, "soundtrack-checkpoint.json");
      expect(await readSoundtrackCheckpoint(cpPath)).toBeNull();

      await writeSoundtrackCheckpoint(cpPath, {
        schema_version: 1,
        soundtrack_fingerprint: fp1,
        duration_seconds: 60.5,
        bgm_track_id: "track_a",
        bgm_filename: "track_a.mp3",
        created_at: new Date().toISOString(),
      });

      const loaded = await readSoundtrackCheckpoint(cpPath);
      expect(loaded).toBeTruthy();
      expect(loaded?.soundtrack_fingerprint).toBe(fp1);
      expect(loaded?.duration_seconds).toBe(60.5);
      expect(loaded?.bgm_track_id).toBe("track_a");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

