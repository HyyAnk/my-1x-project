import { describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import {
  adaptMascotForQuestion,
  createMascotAnimationRenderSnapshot,
  findSnapshotEntry,
  renderProductionMascotHtmlLayer,
  resolveQuestionBundleAction,
} from "../src/quiz/render/productionMascotRenderer.js";

function createDualMediaMascot(): MascotProfile {
  return {
    id: "owl-dual-media",
    name: "Professor Owl Dual Media",
    visual_style: "pixar_3d",
    master_image_url: "https://example.com/master.png",
    assigned_channel_ids: [],
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    styles: [
      {
        id: "core",
        name: "Core Style",
        anchor_image_url: "https://example.com/anchor.png",
        is_default: true,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
        states: {
          thinking: [
            {
              id: "think-slot-1",
              slot_index: 1,
              image_url: "https://example.com/still_think_1.png",
              status: "ready",
              animation: {
                transparent_video_url: "https://example.com/video_think_1.webm",
                fps: 24,
                frame_count: 96,
                content_fingerprint: "fingerprint-think-1",
              },
            },
            {
              id: "think-slot-2",
              slot_index: 2,
              image_url: "https://example.com/still_think_2.png",
              status: "ready",
              animation: {
                transparent_video_url: "https://example.com/video_think_2.webm",
                fps: 24,
                frame_count: 96,
                content_fingerprint: "fingerprint-think-2",
              },
            },
          ],
          celebrate: [
            {
              id: "celeb-slot-1",
              slot_index: 1,
              image_url: "https://example.com/still_celeb_1.png",
              status: "ready",
              animation: {
                transparent_video_url: "https://example.com/video_celeb_1.webm",
                fps: 24,
                frame_count: 96,
                content_fingerprint: "fingerprint-celeb-1",
              },
            },
          ],
        },
      },
    ],
  };
}

describe("Mascot Media Mode Bundle Adaptation & Deterministic Selection (Phase 2)", () => {
  describe("resolveQuestionBundleAction", () => {
    it("omits animation asset and sets image_url in static mode", () => {
      const mascot = createDualMediaMascot();
      const variant = mascot.styles[0].states.thinking[0];

      const action = resolveQuestionBundleAction("thinking", variant, mascot.styles[0].anchor_image_url, null, false, "static");
      expect(action).toBeDefined();
      expect(action?.action).toBe("thinking");
      expect(action?.image_url).toBe("https://example.com/still_think_1.png");
      expect(action?.animation).toBeUndefined();
      expect((action as { legacy_animation?: unknown })?.legacy_animation).toBeUndefined();
    });

    it("attaches animation asset in animation mode", () => {
      const mascot = createDualMediaMascot();
      const variant = mascot.styles[0].states.thinking[0];

      const action = resolveQuestionBundleAction("thinking", variant, mascot.styles[0].anchor_image_url, null, false, "animation");
      expect(action).toBeDefined();
      expect(action?.action).toBe("thinking");
      expect(action?.image_url).toBe("https://example.com/video_think_1.webm");
      expect(action?.animation).toBeDefined();
      expect(action?.animation?.transparent_video_url).toBe("https://example.com/video_think_1.webm");
    });
  });

  describe("adaptMascotForQuestion", () => {
    it("produces image-only render bundle with no animation under default static mode", () => {
      const mascot = createDualMediaMascot();
      const adapted = adaptMascotForQuestion(mascot, "core", 0);

      expect(adapted).toBeDefined();
      const thinkingAction = adapted?.render_bundle?.assets.actions.thinking;
      const celebrateAction = adapted?.render_bundle?.assets.actions.celebrate;

      expect(thinkingAction).toBeDefined();
      expect(thinkingAction?.image_url).toContain("still_think_");
      expect(thinkingAction?.animation).toBeUndefined();

      expect(celebrateAction).toBeDefined();
      expect(celebrateAction?.image_url).toContain("still_celeb_");
      expect(celebrateAction?.animation).toBeUndefined();
    });

    it("produces animated render bundle under animation mode", () => {
      const mascot = createDualMediaMascot();
      const adapted = adaptMascotForQuestion(mascot, "core", 0, {
        mediaMode: "animation",
      });

      expect(adapted).toBeDefined();
      const thinkingAction = adapted?.render_bundle?.assets.actions.thinking;
      const celebrateAction = adapted?.render_bundle?.assets.actions.celebrate;

      expect(thinkingAction).toBeDefined();
      expect(thinkingAction?.image_url).toContain("video_think_");
      expect(thinkingAction?.animation).toBeDefined();
      expect(thinkingAction?.animation?.transparent_video_url).toContain("video_think_");

      expect(celebrateAction).toBeDefined();
      expect(celebrateAction?.image_url).toContain("video_celeb_");
      expect(celebrateAction?.animation).toBeDefined();
      expect(celebrateAction?.animation?.transparent_video_url).toContain("video_celeb_");
    });

    it("selects thinking and celebrate independently from their available variant pools", () => {
      const mascot = createDualMediaMascot();
      mascot.styles[0].states.celebrate = [
        ...mascot.styles[0].states.celebrate,
        {
          id: "celeb-slot-2",
          slot_index: 2,
          image_url: "https://example.com/still_celeb_2.png",
          status: "ready",
          animation: {
            transparent_video_url: "https://example.com/video_celeb_2.webm",
          },
        },
      ];
      const seeds = [0, 1];

      const adapted = adaptMascotForQuestion(mascot, "core", 0, {
        mediaMode: "static",
        randomSeed: () => seeds.shift() ?? 0,
      });

      expect(adapted?.render_bundle?.assets.actions.thinking?.image_url).toContain("still_think_1");
      expect(adapted?.render_bundle?.assets.actions.celebrate?.image_url).toContain("still_celeb_2");
    });

    it("omits mascot actions when static mode has no usable still variants", () => {
      const mascot = createDualMediaMascot();
      mascot.styles[0].states.thinking = [
        {
          id: "thinking-animation-only",
          slot_index: 1,
          image_url: null,
          status: "ready",
          animation: { transparent_video_url: "https://example.com/thinking.webm" },
        },
      ];
      mascot.styles[0].states.celebrate = [];

      const adapted = adaptMascotForQuestion(mascot, "core", 0, { mediaMode: "static" });

      expect(adapted?.render_bundle?.assets.actions.thinking).toBeUndefined();
      expect(adapted?.render_bundle?.assets.actions.celebrate).toBeUndefined();
    });

    it("keeps independent random selections in a secondary style through HTML rendering", () => {
      const mascot = createDualMediaMascot();
      const style = mascot.styles[0];
      mascot.styles = [{ ...style, id: "alternate", is_default: false }];
      mascot.styles[0].states.celebrate.push({
        id: "celeb-slot-2",
        slot_index: 2,
        image_url: "https://example.com/still_celeb_2.png",
        status: "ready",
      });
      const seeds = [1, 0];
      const adapted = adaptMascotForQuestion(mascot, "alternate", 0, {
        mediaMode: "static",
        randomSeed: () => seeds.shift() ?? 0,
      });
      const html = renderProductionMascotHtmlLayer(
        adapted,
        { enabled: true },
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: 4,
          mediaMode: "static",
          timelineEvents: [{ type: "answer.reveal", at_seconds: 2 }],
        },
      );

      expect(html).toContain("still_think_2.png");
      expect(html).toContain("still_celeb_1.png");
      expect(html).not.toContain("still_think_1.png");
      expect(html).not.toContain("still_celeb_2.png");
    });

    it("renders no question mascot when the static style has no usable variants", () => {
      const mascot = createDualMediaMascot();
      mascot.styles[0].states.thinking = [];
      mascot.styles[0].states.celebrate = [];
      const adapted = adaptMascotForQuestion(mascot, "core", 0, { mediaMode: "static" });
      const html = renderProductionMascotHtmlLayer(
        adapted,
        { enabled: true },
        {
          phase: "question",
          clipStartSeconds: 0,
          clipDurationSeconds: 4,
          mediaMode: "static",
          timelineEvents: [{ type: "answer.reveal", at_seconds: 2 }],
        },
      );

      expect(html).toBe("");
    });
  });

  describe("Deterministic Snapshot Parity", () => {
    it("accurately records media_mode, media_type, and image_url in snapshot entries for static mode", () => {
      const mascot = createDualMediaMascot();
      const snapshot = createMascotAnimationRenderSnapshot("ep-test-static-mode");

      adaptMascotForQuestion(mascot, "core", 0, {
        videoId: "ep-test-static-mode",
        questionId: "q_1",
        snapshot,
        mediaMode: "static",
      });

      expect(snapshot.entries.length).toBe(2);

      const thinkingEntry = findSnapshotEntry(snapshot, {
        videoId: "ep-test-static-mode",
        questionId: "q_1",
        state: "thinking",
        styleId: "core",
      });
      expect(thinkingEntry).toBeDefined();
      expect(thinkingEntry?.media_mode).toBe("static");
      expect(thinkingEntry?.media_type).toBe("image");
      expect(thinkingEntry?.image_url).toContain("still_think_");
      expect(thinkingEntry?.fingerprint).toBeDefined();

      const celebrateEntry = findSnapshotEntry(snapshot, {
        videoId: "ep-test-static-mode",
        questionId: "q_1",
        state: "celebrate",
        styleId: "core",
      });
      expect(celebrateEntry).toBeDefined();
      expect(celebrateEntry?.media_mode).toBe("static");
      expect(celebrateEntry?.media_type).toBe("image");
      expect(celebrateEntry?.image_url).toContain("still_celeb_");
    });

    it("accurately records media_mode, media_type, and video URLs for animation mode", () => {
      const mascot = createDualMediaMascot();
      const snapshot = createMascotAnimationRenderSnapshot("ep-test-anim-mode");

      adaptMascotForQuestion(mascot, "core", 0, {
        videoId: "ep-test-anim-mode",
        questionId: "q_1",
        snapshot,
        mediaMode: "animation",
      });

      expect(snapshot.entries.length).toBe(2);

      const thinkingEntry = findSnapshotEntry(snapshot, {
        videoId: "ep-test-anim-mode",
        questionId: "q_1",
        state: "thinking",
        styleId: "core",
      });
      expect(thinkingEntry).toBeDefined();
      expect(thinkingEntry?.media_mode).toBe("animation");
      expect(thinkingEntry?.media_type).toBe("video");
      expect(thinkingEntry?.transparent_video_url).toContain("video_think_");

      const celebrateEntry = findSnapshotEntry(snapshot, {
        videoId: "ep-test-anim-mode",
        questionId: "q_1",
        state: "celebrate",
        styleId: "core",
      });
      expect(celebrateEntry).toBeDefined();
      expect(celebrateEntry?.media_mode).toBe("animation");
      expect(celebrateEntry?.media_type).toBe("video");
      expect(celebrateEntry?.transparent_video_url).toContain("video_celeb_");
    });

    it("restores exact variant and preserves deterministic identity on re-render with snapshot", () => {
      const mascot = createDualMediaMascot();
      const snapshot = createMascotAnimationRenderSnapshot("ep-replay");

      const firstPass = adaptMascotForQuestion(mascot, "core", 0, {
        videoId: "ep-replay",
        questionId: "q_1",
        snapshot,
        mediaMode: "static",
      });

      const secondPass = adaptMascotForQuestion(mascot, "core", 0, {
        videoId: "ep-replay",
        questionId: "q_1",
        snapshot,
        mediaMode: "static",
      });

      expect(firstPass?.render_bundle?.assets.actions.thinking?.image_url).toBe(
        secondPass?.render_bundle?.assets.actions.thinking?.image_url,
      );
      expect(firstPass?.render_bundle?.assets.actions.celebrate?.image_url).toBe(
        secondPass?.render_bundle?.assets.actions.celebrate?.image_url,
      );
      expect(snapshot.entries.length).toBe(2);
    });
  });
});
