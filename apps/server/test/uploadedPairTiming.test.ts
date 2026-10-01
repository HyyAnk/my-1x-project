import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { QuizTimelineSchema } from "@studio/shared";
import { buildRetimedNarrationFilter, matchesBookendTiming } from "../src/quiz/introOutro/renderTiming.js";
import { mixMasterSoundtrack } from "../src/quiz/audio/soundtrackMixer.js";

const execute = promisify(execFile);
const timeline = (start: number, duration = 4) =>
  QuizTimelineSchema.parse({
    schema_version: 2,
    episode_id: "test",
    duration_seconds: duration,
    events: [
      {
        event_id: "speech",
        type: "narration.segment",
        at_seconds: start,
        duration_seconds: 1,
        question_id: "q1",
        choice_id: null,
        segment_id: "body",
        payload: {},
      },
    ],
  });

async function peak(file: string, start: number, duration: number): Promise<number> {
  const { stdout } = await execute(
    "ffmpeg",
    ["-v", "error", "-ss", String(start), "-i", file, "-t", String(duration), "-ac", "1", "-f", "f32le", "pipe:1"],
    { encoding: "buffer", windowsHide: true },
  );
  let maximum = 0;
  for (let index = 0; index + 4 <= stdout.length; index += 4) maximum = Math.max(maximum, Math.abs(stdout.readFloatLE(index)));
  return maximum;
}

describe("Uploaded media audio boundaries", () => {
  let root: string;
  let source: string;
  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "pair-timing-"));
    source = path.join(root, "legacy.wav");
    await execute(
      "ffmpeg",
      ["-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-ac", "2", "-c:a", "pcm_s16le", source],
      { windowsHide: true },
    );
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("retimes only body speech and keeps uploaded bookend windows silent", async () => {
    const output = path.join(root, "retimed.wav");
    const filter = buildRetimedNarrationFilter(timeline(2), timeline(1));
    await execute("ffmpeg", ["-y", "-i", source, "-filter_complex", filter, "-map", "[out]", output], { windowsHide: true });
    expect(await peak(output, 0, 0.9)).toBe(0);
    expect(await peak(output, 1.1, 0.8)).toBeGreaterThan(0.05);
    expect(await peak(output, 2.1, 1.8)).toBe(0);
  });

  it("rejects incompatible speech instead of shifting wrong audio", () => {
    const changed = timeline(1);
    changed.events[0].segment_id = "missing";
    expect(() => buildRetimedNarrationFilter(timeline(2), changed)).toThrow("Regenerate episode voice");
    expect(matchesBookendTiming(null, 0, 0)).toBe(false);
  });

  it("mutes the entire system mix outside the body, including residual speech and effects", async () => {
    const output = path.join(root, "master.wav");
    const result = await mixMasterSoundtrack({
      narrationPath: source,
      timeline: timeline(1),
      durationSeconds: 4,
      activeWindow: { start: 1, end: 2 },
      workingDirectory: path.join(root, "mix"),
      outputPath: output,
      bgmCandidateDirectories: [],
      sfxCandidateDirectories: [],
      loudnorm: false,
    });
    expect(result.durationSeconds).toBeCloseTo(4, 2);
    expect(await peak(output, 0, 0.95)).toBe(0);
    expect(await peak(output, 1.1, 0.8)).toBeGreaterThan(0.05);
    expect(await peak(output, 2.05, 1.9)).toBe(0);
  });
});
