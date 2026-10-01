import { describe, expect, it, vi } from "vitest";
import type { Episode, QuizTimeline } from "@studio/shared";
import { prepareSoundtrack } from "../src/tasks/video/soundtrackPreparation.js";
import * as soundtrackMixerModule from "../src/quiz/audio/soundtrackMixer.js";
import * as checkpointsModule from "../src/tasks/checkpoints.js";
import * as artifactFilesModule from "../src/tasks/artifactFiles.js";

describe("Soundtrack Preparation with Bridge Scenes", () => {
  it("starts BGM from bridge.topic.enter when bridge scene is present", async () => {
    let capturedOptions: soundtrackMixerModule.MixMasterSoundtrackOptions | null = null;
    vi.spyOn(soundtrackMixerModule, "mixMasterSoundtrack").mockImplementation(async (opts) => {
      capturedOptions = opts;
      return {
        outputPath: opts.outputPath,
        durationSeconds: opts.durationSeconds,
        plan: {
          durationSeconds: opts.durationSeconds,
          narrationPath: opts.narrationPath,
          bgmItems: [{ id: "b1", trackId: "track-1", filename: "track-1.mp3", filePath: "track-1.mp3", startSeconds: 8, durationSeconds: 50, volume: 0.04, fadeInSeconds: 1, fadeOutSeconds: 1 }],
          sfxItems: [],
        },
      };
    });

    vi.spyOn(checkpointsModule, "readSoundtrackCheckpoint").mockResolvedValue(null);
    vi.spyOn(checkpointsModule, "writeSoundtrackCheckpoint").mockResolvedValue();
    vi.spyOn(artifactFilesModule, "hasNonEmptyFile").mockResolvedValue(false);

    const mockTimeline: QuizTimeline = {
      schema_version: 2,
      duration_seconds: 60,
      events: [
        { event_id: "e1", type: "intro.enter", at_seconds: 0, duration_seconds: 8, question_id: null, choice_id: null, segment_id: "intro", payload: {} },
        { event_id: "e2", type: "bridge.topic.enter", at_seconds: 8, duration_seconds: 6, question_id: null, choice_id: null, segment_id: "intro_topic", payload: {} },
        { event_id: "e3", type: "bridge.cta.enter", at_seconds: 14, duration_seconds: 6, question_id: null, choice_id: null, segment_id: "intro_cta", payload: {} },
        { event_id: "e4", type: "question.enter", at_seconds: 20, duration_seconds: 1, question_id: "q1", choice_id: null, segment_id: null, payload: {} },
      ],
    };

    const mockEpisode: Episode = {
      episode_id: "ep-test",
      channel_id: "ch-test",
      slug: "ep-test",
      title: "Test Episode",
      status: "DRAFT",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await prepareSoundtrack({
      renderRoot: "/tmp/render",
      narration: { absolutePath: "/tmp/narration.wav", modified_at: new Date().toISOString(), size: 1000 },
      timeline: mockTimeline,
      episode: mockEpisode,
      bgmHistory: [],
      assetSources: {},
      introOutro: { introVideoPath: "/tmp/intro.mp4" },
    });

    expect(capturedOptions).not.toBeNull();
    // BGM startSeconds should be 8 (from bridge.topic.enter), NOT 20 (from question.enter)
    expect(capturedOptions?.bgmOptions?.startSeconds).toBe(8);
    expect(capturedOptions?.activeWindow?.start).toBe(8);
  });

  it("falls back to question.enter when bridge scene is absent", async () => {
    let capturedOptions: soundtrackMixerModule.MixMasterSoundtrackOptions | null = null;
    vi.spyOn(soundtrackMixerModule, "mixMasterSoundtrack").mockImplementation(async (opts) => {
      capturedOptions = opts;
      return {
        outputPath: opts.outputPath,
        durationSeconds: opts.durationSeconds,
        plan: {
          durationSeconds: opts.durationSeconds,
          narrationPath: opts.narrationPath,
          bgmItems: [],
          sfxItems: [],
        },
      };
    });

    vi.spyOn(checkpointsModule, "readSoundtrackCheckpoint").mockResolvedValue(null);
    vi.spyOn(checkpointsModule, "writeSoundtrackCheckpoint").mockResolvedValue();
    vi.spyOn(artifactFilesModule, "hasNonEmptyFile").mockResolvedValue(false);

    const mockTimeline: QuizTimeline = {
      schema_version: 2,
      duration_seconds: 60,
      events: [
        { event_id: "e1", type: "intro.enter", at_seconds: 0, duration_seconds: 5, question_id: null, choice_id: null, segment_id: "intro", payload: {} },
        { event_id: "e4", type: "question.enter", at_seconds: 5, duration_seconds: 1, question_id: "q1", choice_id: null, segment_id: null, payload: {} },
      ],
    };

    const mockEpisode: Episode = {
      episode_id: "ep-test-2",
      channel_id: "ch-test",
      slug: "ep-test-2",
      title: "Test Episode 2",
      status: "DRAFT",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await prepareSoundtrack({
      renderRoot: "/tmp/render",
      narration: { absolutePath: "/tmp/narration.wav", modified_at: new Date().toISOString(), size: 1000 },
      timeline: mockTimeline,
      episode: mockEpisode,
      bgmHistory: [],
      assetSources: {},
      introOutro: { introVideoPath: "/tmp/intro.mp4" },
    });

    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions?.bgmOptions?.startSeconds).toBe(5);
    expect(capturedOptions?.activeWindow?.start).toBe(5);
  });

  it("resolves synchronized SFX events for bridge topic scene in resolveSfxSchedule", () => {
    const events: QuizTimeline["events"] = [
      {
        event_id: "sfx-1",
        type: "sfx.play",
        at_seconds: 8.0,
        duration_seconds: 0.5,
        question_id: null,
        choice_id: null,
        segment_id: "intro_topic",
        payload: { sound: "transition_fast", name: "scene_entrance" },
      },
      {
        event_id: "sfx-2",
        type: "sfx.play",
        at_seconds: 8.28,
        duration_seconds: 0.35,
        question_id: null,
        choice_id: null,
        segment_id: "intro_topic",
        payload: { sound: "ui_pop", name: "count_sticker_bounce" },
      },
      {
        event_id: "sfx-3",
        type: "sfx.play",
        at_seconds: 8.7,
        duration_seconds: 0.6,
        question_id: null,
        choice_id: null,
        segment_id: "intro_topic",
        payload: { sound: "correct_small", name: "topic_sparkle" },
      },
    ];

    const sfxItems = soundtrackMixerModule.resolveSfxSchedule(events);
    expect(sfxItems.length).toBe(3);
    expect(sfxItems[0].intent).toBe("transition_fast");
    expect(sfxItems[0].filename).toBe("lightning_brush.wav");
    expect(sfxItems[0].startSeconds).toBe(8.0);

    expect(sfxItems[1].intent).toBe("ui_pop");
    expect(sfxItems[1].filename).toBe("ui_pop.wav");
    expect(sfxItems[1].startSeconds).toBe(8.28);

    expect(sfxItems[2].intent).toBe("correct_small");
    expect(sfxItems[2].filename).toBe("correct_ding.wav");
    expect(sfxItems[2].startSeconds).toBe(8.7);
  });

  it("starts BGM from bridge.cta.enter when only CTA bridge scene is present", async () => {
    let capturedOptions: soundtrackMixerModule.MixMasterSoundtrackOptions | null = null;
    vi.spyOn(soundtrackMixerModule, "mixMasterSoundtrack").mockImplementation(async (opts) => {
      capturedOptions = opts;
      return {
        outputPath: opts.outputPath,
        durationSeconds: opts.durationSeconds,
        plan: {
          durationSeconds: opts.durationSeconds,
          narrationPath: opts.narrationPath,
          bgmItems: [{ id: "b1", trackId: "track-1", filename: "track-1.mp3", filePath: "track-1.mp3", startSeconds: 7, durationSeconds: 50, volume: 0.04, fadeInSeconds: 1, fadeOutSeconds: 1 }],
          sfxItems: [],
        },
      };
    });

    vi.spyOn(checkpointsModule, "readSoundtrackCheckpoint").mockResolvedValue(null);
    vi.spyOn(checkpointsModule, "writeSoundtrackCheckpoint").mockResolvedValue();
    vi.spyOn(artifactFilesModule, "hasNonEmptyFile").mockResolvedValue(false);

    const mockTimeline: QuizTimeline = {
      schema_version: 2,
      duration_seconds: 60,
      events: [
        { event_id: "e1", type: "intro.enter", at_seconds: 0, duration_seconds: 7, question_id: null, choice_id: null, segment_id: "intro", payload: {} },
        { event_id: "e3", type: "bridge.cta.enter", at_seconds: 7, duration_seconds: 6, question_id: null, choice_id: null, segment_id: "intro_cta", payload: {} },
        { event_id: "e4", type: "question.enter", at_seconds: 13, duration_seconds: 1, question_id: "q1", choice_id: null, segment_id: null, payload: {} },
      ],
    };

    const mockEpisode: Episode = {
      episode_id: "ep-cta-test",
      channel_id: "ch-test",
      slug: "ep-cta-test",
      title: "Test CTA Episode",
      status: "DRAFT",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await prepareSoundtrack({
      renderRoot: "/tmp/render",
      narration: { absolutePath: "/tmp/narration.wav", modified_at: new Date().toISOString(), size: 1000 },
      timeline: mockTimeline,
      episode: mockEpisode,
      bgmHistory: [],
      assetSources: {},
      introOutro: { introVideoPath: "/tmp/intro.mp4" },
    });

    expect(capturedOptions).not.toBeNull();
    expect(capturedOptions?.bgmOptions?.startSeconds).toBe(7);
    expect(capturedOptions?.activeWindow?.start).toBe(7);
  });

  it("resolves synchronized SFX events for bridge CTA scene in resolveSfxSchedule", () => {
    const events: QuizTimeline["events"] = [
      {
        event_id: "sfx-cta-1",
        type: "sfx.play",
        at_seconds: 14.0,
        duration_seconds: 0.5,
        question_id: null,
        choice_id: null,
        segment_id: "intro_cta",
        payload: { sound: "transition_fast", name: "cta_entrance", volume: 0.65 },
      },
      {
        event_id: "sfx-cta-2",
        type: "sfx.play",
        at_seconds: 15.4,
        duration_seconds: 0.35,
        question_id: null,
        choice_id: null,
        segment_id: "intro_cta",
        payload: { sound: "ui_pop", name: "subscribe_click", volume: 0.7 },
      },
      {
        event_id: "sfx-cta-3",
        type: "sfx.play",
        at_seconds: 16.2,
        duration_seconds: 0.6,
        question_id: null,
        choice_id: null,
        segment_id: "intro_cta",
        payload: { sound: "correct_small", name: "bell_ding", volume: 0.65 },
      },
      {
        event_id: "sfx-cta-4",
        type: "sfx.play",
        at_seconds: 16.6,
        duration_seconds: 0.8,
        question_id: null,
        choice_id: null,
        segment_id: "intro_cta",
        payload: { sound: "streak", name: "celebration_burst", volume: 0.6 },
      },
    ];

    const sfxItems = soundtrackMixerModule.resolveSfxSchedule(events);
    expect(sfxItems.length).toBe(4);

    expect(sfxItems[0].intent).toBe("transition_fast");
    expect(sfxItems[0].filename).toBe("lightning_brush.wav");
    expect(sfxItems[0].startSeconds).toBe(14.0);
    expect(sfxItems[0].volume).toBe(0.65);

    expect(sfxItems[1].intent).toBe("ui_pop");
    expect(sfxItems[1].filename).toBe("ui_pop.wav");
    expect(sfxItems[1].startSeconds).toBe(15.4);
    expect(sfxItems[1].volume).toBe(0.7);

    expect(sfxItems[2].intent).toBe("correct_small");
    expect(sfxItems[2].filename).toBe("correct_ding.wav");
    expect(sfxItems[2].startSeconds).toBe(16.2);
    expect(sfxItems[2].volume).toBe(0.65);

    expect(sfxItems[3].intent).toBe("streak");
    expect(sfxItems[3].filename).toBe("streak.wav");
    expect(sfxItems[3].startSeconds).toBe(16.6);
    expect(sfxItems[3].volume).toBe(0.6);
  });
});

