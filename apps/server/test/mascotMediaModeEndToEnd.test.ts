import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resolveEffectiveMascotMediaMode,
  type AppConfig,
  type Channel,
  type MascotProfile,
  type MascotStateMediaMode,
} from "@studio/shared";
import { DEFAULT_CONFIG } from "../src/config.js";
import type { RepositoryService } from "../src/repository/service.js";
import { prepareLocalizedMascot } from "../src/tasks/video/mascotLocalization.js";
import { compileCompositionHtml } from "../src/tasks/video/compositionHtmlCompiler.js";
import {
  compileTestTimeline,
  createMultiQuestionQuiz,
  findQuestionComposition,
  setupParityMascotWorkspace,
} from "./mascotVideoParityHelpers.js";

describe("Mascot State Media Mode End-to-End Regression Suite (Phase 5)", () => {
  let tempDir: string;
  let renderRoot: string;
  let repository: RepositoryService;
  let baseChannel: Channel;
  let mascot: MascotProfile;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "mascot-media-mode-e2e-"));
    renderRoot = path.join(tempDir, "render_output");
    const setup = await setupParityMascotWorkspace(tempDir);
    repository = setup.repository;
    baseChannel = setup.channel;
    mascot = setup.mascot;
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  async function compileWithSettings(options: {
    globalMediaMode?: MascotStateMediaMode;
    channelMediaMode?: MascotStateMediaMode | "inherit";
    mascotProfile?: MascotProfile | null;
    mascotEnabled?: boolean;
    questionCount?: number;
  }): Promise<{ html: string; compositionFiles: Record<string, string>; effectiveMode: MascotStateMediaMode }> {
    const localizedMascot = options.mascotProfile !== undefined
      ? options.mascotProfile
      : await prepareLocalizedMascot(baseChannel, repository, renderRoot);

    const channelMascotConfig = {
      enabled: options.mascotEnabled ?? true,
      position: "bottom_right" as const,
      scale: 1.0,
      offset_x: 0,
      offset_y: 0,
      flip_x: false,
      show_in_intro: true,
      show_in_outro: true,
      show_in_question: true,
      ...(options.channelMediaMode !== undefined ? { mascot_media_mode: options.channelMediaMode } : {}),
    };

    const effectiveMode = resolveEffectiveMascotMediaMode(
      channelMascotConfig,
      options.globalMediaMode ?? DEFAULT_CONFIG.video_generation.mascot_media_mode,
    );

    const quiz = createMultiQuestionQuiz(options.questionCount ?? 4);
    const { director, timeline } = compileTestTimeline(quiz);

    const result = await compileCompositionHtml({
      artifacts: {
        quiz,
        director,
        timeline,
        assetPlan: { assets: [], plan_revision: 1 } as any,
      },
      channel: {
        ...baseChannel,
        mascot_config: channelMascotConfig,
      },
      episode: {
        episode_id: "ep-e2e-regression",
        channel_id: baseChannel.channel_id,
        title: "E2E Mascot Media Mode Verification",
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
      introOutro: {
        introVideoPath: null,
        outroVideoPath: null,
        transitionType: "none",
        transitionDurationSeconds: 0,
        audioMode: "full_narration",
        introHasAudio: false,
        outroHasAudio: false,
      },
      mascotMediaMode: effectiveMode,
    });

    return {
      html: result.html,
      compositionFiles: result.compositionFiles ?? {},
      effectiveMode,
    };
  }

  describe("System Default & Config Resolution", () => {
    it("guarantees platform default media mode is 'static'", () => {
      expect(DEFAULT_CONFIG.video_generation.mascot_media_mode).toBe("static");
    });

    it("resolves effective mode to 'static' when channel and global config are unspecified", () => {
      const mode = resolveEffectiveMascotMediaMode(undefined, undefined);
      expect(mode).toBe("static");
    });
  });

  describe("4-Combination Precedence Matrix (Global x Channel Override)", () => {
    it("Combination 1: Global static + Channel inherit -> Effective static (img only, no video)", async () => {
      const { compositionFiles, effectiveMode } = await compileWithSettings({
        globalMediaMode: "static",
        channelMediaMode: "inherit",
      });

      expect(effectiveMode).toBe("static");

      for (let i = 1; i <= 4; i++) {
        const qHtml = findQuestionComposition(compositionFiles, i);
        expect(qHtml, `Question ${i} composition must exist`).toBeDefined();
        expect(qHtml, `Question ${i} must contain static image`).toMatch(/<img\b[^>]*class="[^"]*mascot-v2-image/);
        expect(qHtml, `Question ${i} must not contain video element`).not.toMatch(/<video\b[^>]*data-mascot-animation-video/);
      }
    });

    it("Combination 2: Global static + Channel animation override -> Effective animation (video rendered)", async () => {
      const { compositionFiles, effectiveMode } = await compileWithSettings({
        globalMediaMode: "static",
        channelMediaMode: "animation",
      });

      expect(effectiveMode).toBe("animation");

      let foundVideo = false;
      for (let i = 1; i <= 4; i++) {
        const qHtml = findQuestionComposition(compositionFiles, i);
        expect(qHtml, `Question ${i} composition must exist`).toBeDefined();
        if (qHtml?.includes("<video")) {
          foundVideo = true;
          expect(qHtml).toMatch(/<video\b[^>]*data-mascot-animation-video/);
          expect(qHtml).toMatch(/<video\b[^>]*autoplay/);
          expect(qHtml).toMatch(/<video\b[^>]*muted/);
          expect(qHtml).toMatch(/<video\b[^>]*playsinline/);
          expect(qHtml).toMatch(/src="(?:\.\/)?mascot-assets\/[^"]+\.webm"/);
        }
      }
      expect(foundVideo, "At least one animated question slot must render <video> tag").toBe(true);
    });

    it("Combination 3: Global animation + Channel inherit -> Effective animation (video rendered)", async () => {
      const { compositionFiles, effectiveMode } = await compileWithSettings({
        globalMediaMode: "animation",
        channelMediaMode: "inherit",
      });

      expect(effectiveMode).toBe("animation");

      let foundVideo = false;
      for (let i = 1; i <= 4; i++) {
        const qHtml = findQuestionComposition(compositionFiles, i);
        expect(qHtml, `Question ${i} composition must exist`).toBeDefined();
        if (qHtml?.includes("<video")) {
          foundVideo = true;
          expect(qHtml).toMatch(/<video\b[^>]*data-mascot-animation-video/);
        }
      }
      expect(foundVideo, "At least one animated question slot must render <video> tag").toBe(true);
    });

    it("Combination 4: Global animation + Channel static override -> Effective static (img only, no video)", async () => {
      const { compositionFiles, effectiveMode } = await compileWithSettings({
        globalMediaMode: "animation",
        channelMediaMode: "static",
      });

      expect(effectiveMode).toBe("static");

      for (let i = 1; i <= 4; i++) {
        const qHtml = findQuestionComposition(compositionFiles, i);
        expect(qHtml, `Question ${i} composition must exist`).toBeDefined();
        expect(qHtml, `Question ${i} must contain static image`).toMatch(/<img\b[^>]*class="[^"]*mascot-v2-image/);
        expect(qHtml, `Question ${i} must not contain video element`).not.toMatch(/<video\b[^>]*data-mascot-animation-video/);
      }
    });
  });

  describe("Backward Compatibility & Edge Cases", () => {
    it("handles legacy channels with omitted mascot_media_mode seamlessly as static", async () => {
      const { compositionFiles, effectiveMode } = await compileWithSettings({
        globalMediaMode: "static",
        channelMediaMode: undefined,
      });

      expect(effectiveMode).toBe("static");

      for (let i = 1; i <= 4; i++) {
        const qHtml = findQuestionComposition(compositionFiles, i);
        expect(qHtml).toBeDefined();
        expect(qHtml).not.toMatch(/<video\b[^>]*data-mascot-animation-video/);
      }
    });

    it("renders zero mascot HTML elements when channel mascot is disabled", async () => {
      const { compositionFiles } = await compileWithSettings({
        globalMediaMode: "animation",
        channelMediaMode: "animation",
        mascotEnabled: false,
      });

      for (const [, html] of Object.entries(compositionFiles)) {
        expect(html).not.toContain("mascot-container");
        expect(html).not.toContain("mascot-v2-container");
        expect(html).not.toContain("<video");
      }
    });

    it("renders gracefully for legacy mascot profiles lacking animation assets", async () => {
      const legacyMascot: MascotProfile = {
        id: "mascot-legacy-static-only",
        name: "Legacy Static Mascot",
        description: "Fixture without animation metadata",
        visual_style: "pixar_3d",
        master_prompt: "cute friendly robot",
        master_image_url: "./mascot-assets/master.png",
        color_theme: "#3b82f6",
        actions: {
          thinking: {
            action: "thinking",
            sprite_url: "./mascot-assets/thinking.png",
            frames_count: 1,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
          },
          celebrate: {
            action: "celebrate",
            sprite_url: "./mascot-assets/celebrate.png",
            frames_count: 1,
            fps: 8,
            loop: true,
            frame_width: 512,
            frame_height: 512,
            offset_x: 0,
            offset_y: 0,
          },
        },
        assigned_channel_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { compositionFiles, effectiveMode } = await compileWithSettings({
        globalMediaMode: "animation",
        channelMediaMode: "inherit",
        mascotProfile: legacyMascot,
      });

      // Even in animation mode, legacy mascots without animations safely fall back to static stills
      expect(effectiveMode).toBe("animation");
      for (let i = 1; i <= 4; i++) {
        const qHtml = findQuestionComposition(compositionFiles, i);
        expect(qHtml).toBeDefined();
        expect(qHtml).not.toMatch(/<video\b[^>]*data-mascot-animation-video/);
        expect(qHtml).toContain("mascot-container");
      }
    });
  });
});
