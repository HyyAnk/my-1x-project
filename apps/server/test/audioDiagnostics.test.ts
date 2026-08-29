import { describe, expect, it } from "vitest";
import { analyzeWavAudio, diagnoseMasterSoundtrack } from "../src/quiz/audio/audioDiagnostics.js";
import { createSilenceWav, wavDurationSeconds } from "../src/quiz/audio/voiceSynthesis.js";

function wav(seconds: number, sampleRate = 1000, channelCount = 1): Uint8Array {
  const frames = Math.round(seconds * sampleRate);
  const data = Buffer.alloc(frames * 2 * channelCount);
  for (let index = 0; index < frames * channelCount; index += 1) {
    const active = index >= frames * 0.2 && index < frames * 0.7;
    data.writeInt16LE(active ? 9000 : 0, index * 2);
  }
  const output = Buffer.alloc(44 + data.length);
  output.write("RIFF", 0);
  output.writeUInt32LE(36 + data.length, 4);
  output.write("WAVE", 8);
  output.write("fmt ", 12);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(channelCount, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * channelCount * 2, 28);
  output.writeUInt16LE(channelCount * 2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36);
  output.writeUInt32LE(data.length, 40);
  data.copy(output, 44);
  return new Uint8Array(output);
}

describe("voice audio diagnostics", () => {
  it("measures occupancy, low-audio runs, and clipping without wall-clock state", () => {
    const result = analyzeWavAudio(wav(2), [{ start: 0, end: 0.25 }]);
    expect(result.sample_rate).toBe(1000);
    expect(result.speech_occupancy).toBeGreaterThan(0.4);
    expect(result.low_audio_runs.length).toBeGreaterThan(0);
    expect(result.unexpected_low_audio_runs.some((run) => run.duration_seconds > 0.5)).toBe(true);
    expect(result.clipping_samples).toBe(0);
  });

  it("creates valid silence wav buffers with exact duration", () => {
    const silence = createSilenceWav(1.5);
    expect(silence.length).toBe(44 + Math.round(1.5 * 48000 * 4));
    expect(wavDurationSeconds(silence)).toBe(1.5);
  });

  it("diagnoses master soundtrack and flags duration discrepancies or invalid sample rate", () => {
    // 1. Valid 48kHz stereo silence
    const validSoundtrack = createSilenceWav(10.0);
    const validReport = diagnoseMasterSoundtrack(validSoundtrack, 10.0);
    expect(validReport.ok).toBe(true);
    expect(validReport.sample_rate).toBe(48000);
    expect(validReport.channels).toBe(2);
    expect(validReport.clipping_samples).toBe(0);
    expect(validReport.issues.filter((i) => i.severity === "blocker")).toHaveLength(0);

    // 2. Duration mismatch blocker (> 1.0s difference)
    const mismatchReport = diagnoseMasterSoundtrack(validSoundtrack, 15.0);
    expect(mismatchReport.ok).toBe(false);
    expect(mismatchReport.issues.some((i) => i.severity === "blocker" && i.message.includes("differs from expected"))).toBe(true);

    // 3. Format mismatch blocker (1000Hz mono)
    const badFormatReport = diagnoseMasterSoundtrack(wav(5, 1000, 1), 5.0);
    expect(badFormatReport.ok).toBe(false);
    expect(badFormatReport.issues.some((i) => i.severity === "blocker" && i.message.includes("format mismatch"))).toBe(true);
  });
});
