import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Channel, MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../src/repository/service.js";
import { prepareLocalizedMascot } from "../src/tasks/video/mascotLocalization.js";
import { buildCandyArcadeCompositionBundle } from "../src/quiz/render/candyArcadeComposition.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import {
  compileTestTimeline,
  createMultiQuestionQuiz,
  findQuestionComposition,
  setupParityMascotWorkspace,
} from "./mascotVideoParityHelpers.js";

describe("Mascot Video Composition Media Mode (Phase 3)", () => {
  let tempDir: string;
  let renderRoot: string;
  let repository: RepositoryService;
  let channel: Channel;
  let mascot: MascotProfile;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "mascot-media-mode-comp-"));
    renderRoot = path.join(tempDir, "render_output");
    const setup = await setupParityMascotWorkspace(tempDir);
    repository = setup.repository;
    channel = setup.channel;
    mascot = setup.mascot;
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  describe("Candy Arcade Composition Bundle mediaMode propagation", () => {
    it("renders only static images (<img>) and no <video> when media mode defaults to static", async () => {
      const localizedMascot = (await prepareLocalizedMascot(channel, repository, renderRoot))!;
      const quiz = createMultiQuestionQuiz(4);
      const { director, timeline } = compileTestTimeline(quiz);

      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: localizedMascot,
        mascotConfig: {
          enabled: true,
          position: "bottom_right",
          scale: 1.0,
          offset_x: 0,
          offset_y: 0,
          flip_x: false,
          show_in_intro: true,
          show_in_outro: true,
          show_in_question: true,
          // mascot_media_mode is undefined -> defaults to static
        },
        mascotMediaMode: "static",
      });

      expect(bundle.files).toBeDefined();

      for (let i = 1; i <= quiz.questions.length; i++) {
        const qHtml = findQuestionComposition(bundle.files, i);
        expect(qHtml).toBeDefined();

        // Must not contain any video tags for mascot
        expect(qHtml).not.toMatch(/<video\b[^>]*data-mascot-animation-video/);
        // Must contain img tags for mascot
        expect(qHtml).toMatch(/<img\b[^>]*class="[^"]*mascot-v2-image/);
      }
    });

    it("renders <video> elements when media mode is animation and animated variant is selected", async () => {
      const localizedMascot = (await prepareLocalizedMascot(channel, repository, renderRoot))!;
      const quiz = createMultiQuestionQuiz(4);
      const { director, timeline } = compileTestTimeline(quiz);

      const bundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: localizedMascot,
        mascotConfig: {
          enabled: true,
          position: "bottom_right",
          scale: 1.0,
          offset_x: 0,
          offset_y: 0,
          flip_x: false,
          show_in_intro: true,
          show_in_outro: true,
          show_in_question: true,
          mascot_media_mode: "animation",
        },
        mascotMediaMode: "animation",
      });

      expect(bundle.files).toBeDefined();

      let videoTagFound = false;
      for (let i = 1; i <= quiz.questions.length; i++) {
        const qHtml = findQuestionComposition(bundle.files, i);
        expect(qHtml).toBeDefined();

        if (qHtml!.includes("<video")) {
          videoTagFound = true;
          expect(qHtml).toMatch(/<video\b[^>]*data-mascot-animation-video=/);
          expect(qHtml).toMatch(/<video\b[^>]*autoplay/);
          expect(qHtml).toMatch(/<video\b[^>]*muted/);
          expect(qHtml).toMatch(/<video\b[^>]*playsinline/);
          expect(qHtml).toMatch(/src="(?:\.\/)?mascot-assets\/[^"]+\.webm"/);
        }
      }
      expect(videoTagFound).toBe(true);
    });

    it("enforces channel override precedence over global media mode", async () => {
      const localizedMascot = (await prepareLocalizedMascot(channel, repository, renderRoot))!;
      const quiz = createMultiQuestionQuiz(4);
      const { director, timeline } = compileTestTimeline(quiz);

      // Precedence Case 1: Channel "static" overrides Global "animation"
      const staticOverrideBundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: localizedMascot,
        mascotConfig: {
          enabled: true,
          position: "bottom_right",
          scale: 1.0,
          offset_x: 0,
          offset_y: 0,
          flip_x: false,
          show_in_intro: true,
          show_in_outro: true,
          show_in_question: true,
          mascot_media_mode: "static",
        },
        mascotMediaMode: "animation",
      });

      for (let i = 1; i <= quiz.questions.length; i++) {
        const qHtml = findQuestionComposition(staticOverrideBundle.files, i);
        expect(qHtml).not.toMatch(/<video\b[^>]*data-mascot-animation-video/);
      }

      // Precedence Case 2: Channel "animation" overrides Global "static"
      const animOverrideBundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: localizedMascot,
        mascotConfig: {
          enabled: true,
          position: "bottom_right",
          scale: 1.0,
          offset_x: 0,
          offset_y: 0,
          flip_x: false,
          show_in_intro: true,
          show_in_outro: true,
          show_in_question: true,
          mascot_media_mode: "animation",
        },
        mascotMediaMode: "static",
      });

      let foundVideoInAnimOverride = false;
      for (let i = 1; i <= quiz.questions.length; i++) {
        const qHtml = findQuestionComposition(animOverrideBundle.files, i);
        if (qHtml?.includes("<video")) {
          foundVideoInAnimOverride = true;
          break;
        }
      }
      expect(foundVideoInAnimOverride).toBe(true);

      // Precedence Case 3: Channel "inherit" falls back to Global "animation"
      const inheritAnimBundle = buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: localizedMascot,
        mascotConfig: {
          enabled: true,
          position: "bottom_right",
          scale: 1.0,
          offset_x: 0,
          offset_y: 0,
          flip_x: false,
          show_in_intro: true,
          show_in_outro: true,
          show_in_question: true,
          mascot_media_mode: "inherit",
        },
        mascotMediaMode: "animation",
      });

      let foundVideoInInheritAnim = false;
      for (let i = 1; i <= quiz.questions.length; i++) {
        const qHtml = findQuestionComposition(inheritAnimBundle.files, i);
        if (qHtml?.includes("<video")) {
          foundVideoInInheritAnim = true;
          break;
        }
      }
      expect(foundVideoInInheritAnim).toBe(true);
    });
  });

  describe("Sandbox Preview media mode parity", () => {
    it("respects mascot_media_mode in sandbox rehearsal preview", () => {
      // Rehearsal with static mode
      const staticRehearsal = buildSandboxComposition(
        {
          mode: "rehearsal",
          mascot_id: mascot.id,
          mascot_style_id: "core",
          mascot_media_mode: "static",
          mascot_enabled: true,
          aspect_ratio: "16:9",
          question_number: 1,
        },
        mascot,
      );

      expect(staticRehearsal.html).toContain("mascot-container");
      // In static mode, should not have <video tag
      expect(staticRehearsal.html).not.toMatch(/<video\b[^>]*data-mascot-animation-video/);

      // Rehearsal with animation mode
      const animRehearsal = buildSandboxComposition(
        {
          mode: "rehearsal",
          mascot_id: mascot.id,
          mascot_style_id: "core",
          mascot_media_mode: "animation",
          mascot_enabled: true,
          aspect_ratio: "16:9",
          question_number: 1,
        },
        mascot,
      );

      expect(animRehearsal.html).toContain("mascot-container");
    });

    it("respects mascot_media_mode in sandbox snapshot preview", () => {
      // Snapshot with static mode
      const staticSnapshot = buildSandboxComposition(
        {
          mode: "snapshot",
          mascot_id: mascot.id,
          mascot_style_id: "core",
          mascot_media_mode: "static",
          mascot_phase: "thinking",
          mascot_enabled: true,
          aspect_ratio: "16:9",
          question_number: 1,
        },
        mascot,
      );

      expect(staticSnapshot.html).toContain("mascot-container");
      expect(staticSnapshot.html).not.toMatch(/<video\b[^>]*data-mascot-animation-video/);

      // Snapshot with animation mode
      const animSnapshot = buildSandboxComposition(
        {
          mode: "snapshot",
          mascot_id: mascot.id,
          mascot_style_id: "core",
          mascot_media_mode: "animation",
          mascot_phase: "thinking",
          mascot_enabled: true,
          aspect_ratio: "16:9",
          question_number: 1,
        },
        mascot,
      );

      expect(animSnapshot.html).toContain("mascot-container");
    });
  });

  describe("compileCompositionHtml mediaMode propagation", () => {
    it("compiles composition HTML with mascotMediaMode threaded", async () => {
      const { compileCompositionHtml } = await import("../src/tasks/video/compositionHtmlCompiler.js");
      const localizedMascot = (await prepareLocalizedMascot(channel, repository, renderRoot))!;
      const quiz = createMultiQuestionQuiz(2);
      const { director, timeline } = compileTestTimeline(quiz);

      const staticResult = await compileCompositionHtml({
        artifacts: {
          quiz,
          director,
          timeline,
          assetPlan: { assets: [], plan_revision: 1 } as any,
        },
        channel: {
          ...channel,
          mascot_config: {
            enabled: true,
            position: "bottom_right",
            scale: 1.0,
            offset_x: 0,
            offset_y: 0,
            flip_x: false,
            show_in_intro: true,
            show_in_outro: true,
            show_in_question: true,
          },
        },
        episode: {
          episode_id: "ep-compile-test",
          channel_id: channel.channel_id,
          title: "Compile Test",
          quiz_config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        scenes: [],
        renderAspectRatio: "16:9",
        renderFps: 30,
        assetSources: {},
        bgmHistory: [],
        mascotProfile: localizedMascot,
        introOutro: {} as any,
        mascotMediaMode: "static",
      });

      expect(staticResult.html).toBeDefined();
      expect(staticResult.compositionFiles).toBeDefined();
      for (const fileHtml of Object.values(staticResult.compositionFiles ?? {})) {
        expect(fileHtml).not.toMatch(/<video\b[^>]*data-mascot-animation-video/);
      }
    });
  });
});
