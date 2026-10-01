import { chromium, type Browser } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adaptMascotConfigV1ToV2, resolveMascotRenderGeometry, resolveMascotRenderSpec, type MascotRenderBundleV2 } from "@studio/shared";
import { createVideoAnimationAsset } from "./mascotVideoParityHelpers.js";
import { buildBundleActionV2 } from "../src/quiz/render/mascot/adapter/mascotV2BundleBuilder.js";
import { renderMascotHtmlFromBundle } from "../src/quiz/render/mascotHtmlRenderer.js";
import { productionMascotCss } from "../src/quiz/render/candyArcade/productionMascotStyles.js";

describe("Mascot full-canvas CSS placement", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });
  afterAll(async () => {
    await browser?.close();
  });

  const placements = (["16:9", "9:16"] as const).flatMap((aspectRatio) =>
    (["bottom_left", "bottom_right"] as const).flatMap((anchor) => [false, true].map((flip) => ({ aspectRatio, anchor, flip }))),
  );
  it.each(placements)(
    "matches geometry across crop variants ($aspectRatio, $anchor, flip=$flip)",
    async ({ aspectRatio, anchor, flip }) => {
      const portrait = aspectRatio === "9:16";
      const page = await browser.newPage({ viewport: portrait ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
      await page.route("**/*.webm", (route) => route.abort());
      const boxes = [];
      try {
        for (const [width, height, x] of [
          [1166, 688, 100],
          [698, 598, 288],
        ]) {
          for (const state of ["thinking", "celebrate"] as const) {
            const animation = {
              ...createVideoAnimationAsset("canvas", state, 1),
              registration: {
                source_width: width,
                source_height: height,
                content_bounds: { x: 0, y: 0, width, height },
                pivot: { x: width / 2, y: height - 1 },
                offset_x: x,
                offset_y: 720 - height,
              },
              video_registration: {
                source_width: 1280,
                source_height: 720,
                content_bounds: { x, y: 720 - height, width, height },
                pivot: { x: x + width / 2, y: 719 },
                offset_x: 0,
                offset_y: 0,
              },
            };
            animation.frames = animation.frames.map((frame) => ({ ...frame, width, height }));
            const bundle: MascotRenderBundleV2 = {
              config: adaptMascotConfigV1ToV2({
                enabled: true,
                position: anchor,
                scale: 3.75,
                offset_x: 315,
                offset_y: 150,
                flip_x: flip,
              }),
              assets: {
                master: null,
                actions: { [state]: buildBundleActionV2(state, "/fallback.png", "none", 1, "normal", undefined, animation) },
              },
            };
            const phase = state === "thinking" ? "thinking" : "reveal";
            const spec = resolveMascotRenderSpec(bundle, { phase, aspect_ratio: aspectRatio, timeline_time_seconds: 0, playing: true })!;
            const geometry = resolveMascotRenderGeometry(spec);
            for (const preview of [false, true]) {
              const html = renderMascotHtmlFromBundle({
                bundle,
                aspectRatio,
                phaseClass: "mascot-stage",
                preview,
                states: [{ phase, atSeconds: 0, durationSeconds: 60, playing: true }],
              });
              await page.setContent(
                `<style>body{margin:0}${productionMascotCss()}</style><main id="stage" data-aspect-ratio="${aspectRatio}" style="position:relative;width:${portrait ? 1080 : 1920}px;height:${portrait ? 1920 : 1080}px"><div class="quiz-question-clip" style="position:absolute;inset:0">${html}</div></main>`,
              );
              const box = await page.locator("video").boundingBox();
              expect(box).not.toBeNull();
              const portraitX = portrait ? (anchor === "bottom_right" ? -140 : 36) : 0;
              const portraitY = portrait ? -440 : 0;
              expect(box!.x).toBeCloseTo(geometry.box_x + portraitX, 2);
              expect(box!.y).toBeCloseTo(geometry.box_y + portraitY, 2);
              expect(box!.width).toBe(geometry.box_width);
              expect(box!.height).toBe(geometry.box_height);
              boxes.push(box);
            }
          }
        }
        expect(boxes.every((box) => JSON.stringify(box) === JSON.stringify(boxes[0]))).toBe(true);
      } finally {
        await page.close();
      }
    },
  );
});
