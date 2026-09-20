import assert from "node:assert/strict";
import test from "node:test";
import { IntroOutroStyleSchema, QuizConfigSchema } from "../src/index.js";

test("QuizConfigSchema defaults Intro/Outro selection to built-in style", () => {
  const config = QuizConfigSchema.parse({});
  assert.deepEqual(config.intro_outro_selection, { mode: "style_builtin" });
});

test("IntroOutroStyleSchema keeps legacy metadata readable", () => {
  const style = IntroOutroStyleSchema.parse({
    style_id: "legacy_pair",
    channel_id: "channel_1",
    name: "Legacy Pair",
    intro: { filename: "intro.mp4", duration_seconds: 2, width: 1920, height: 1080, fps: 30, has_audio: true },
    outro: { filename: "outro.mp4", duration_seconds: 2, width: 1920, height: 1080, fps: 30, has_audio: true },
    transition_type: "cut",
    transition_duration_seconds: 0,
    audio_mode: "use_video_audio",
    created_at: "2026-09-20T00:00:00.000Z",
    updated_at: "2026-09-20T00:00:00.000Z",
  });
  assert.equal(style.style_preset_id, null);
  assert.equal(style.status, "active");
  assert.equal(style.schema_version, 1);
});
