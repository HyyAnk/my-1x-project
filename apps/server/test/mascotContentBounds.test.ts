import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { RECOMMENDED_MASCOT_PLACEMENT_PRESET_9_16, adaptMascotV1ToV2, type MascotAssetRegistration } from "@studio/shared";
import { renderState } from "../src/quiz/render/mascot/index.js";
import { measureMascotContentBounds, measureRegistrationContentBounds } from "../src/tasks/video/mascotContentBounds.js";
import { resolveQuestionBundleAction } from "../src/quiz/render/mascot/adapter/mascotQuestionVariantSelector.js";
import { stillImageMascot } from "./candyArcadeTestUtils.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

/** A 220x220 transparent canvas with opaque art in the top 150 rows: the kind of mascot cut at its canvas edge. */
async function paddedMascotPng(): Promise<Buffer> {
  const art = await sharp({ create: { width: 220, height: 150, channels: 4, background: { r: 255, g: 180, b: 40, alpha: 1 } } })
    .png()
    .toBuffer();
  return sharp({ create: { width: 220, height: 220, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: art, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

const fullRegistration: MascotAssetRegistration = {
  source_width: 512,
  source_height: 512,
  content_bounds: { x: 0, y: 0, width: 512, height: 512 },
  pivot: { x: 256, y: 512 },
  offset_x: 0,
  offset_y: 0,
};

describe("mascot content bounds measurement", () => {
  it("tightens an unmeasured registration to the opaque pixels, in source coordinates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-bounds-"));
    roots.push(root);
    const file = path.join(root, "celebrate.png");
    await writeFile(file, await paddedMascotPng());

    const measured = await measureRegistrationContentBounds(file, fullRegistration);

    expect(measured).not.toBeNull();
    expect(measured?.source_width).toBe(512);
    expect(measured?.content_bounds.y).toBe(0);
    // 150 of 220 rows are opaque: about 349 of 512 source rows.
    expect(measured?.content_bounds.height).toBeGreaterThanOrEqual(348);
    expect(measured?.content_bounds.height).toBeLessThanOrEqual(350);
    expect(measured?.pivot).toEqual(fullRegistration.pivot);
  });

  it("returns null for a fully transparent image", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-bounds-"));
    roots.push(root);
    const file = path.join(root, "empty.png");
    await writeFile(
      file,
      await sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .png()
        .toBuffer(),
    );
    expect(await measureRegistrationContentBounds(file, fullRegistration)).toBeNull();
  });
});

describe("mascot profile measurement", () => {
  it("fills style variant canvas and content bounds and feeds them into the question action registration", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mascot-bounds-"));
    roots.push(root);
    await mkdir(path.join(root, "mascot-assets"), { recursive: true });
    await writeFile(path.join(root, "mascot-assets", "celebrate.png"), await paddedMascotPng());

    const measured = await measureMascotContentBounds(
      {
        ...stillImageMascot,
        styles: [
          {
            ...stillImageMascot.styles[0],
            states: {
              thinking: [],
              celebrate: [{ id: "c1", slot_index: 1, image_url: "./mascot-assets/celebrate.png", status: "ready" }],
            },
          },
        ],
      },
      root,
    );

    const variant = measured.styles?.[0]?.states.celebrate?.[0];
    expect(variant?.canvas).toEqual({ width: 220, height: 220 });
    expect(variant?.content_bounds).toEqual({ x: 0, y: 0, width: 220, height: 150 });

    const action = resolveQuestionBundleAction("celebrate", variant ?? null, null);
    expect(action?.registration).toMatchObject({
      source_width: 220,
      source_height: 220,
      content_bounds: { x: 0, y: 0, width: 220, height: 150 },
      pivot: { x: 110, y: 220 },
    });
  });
});

describe("mascot ledge metrics", () => {
  function celebrateStateHtml(registration: MascotAssetRegistration): string {
    const bundle = adaptMascotV1ToV2(stillImageMascot)!;
    const placed = {
      ...bundle,
      config: {
        ...bundle.config,
        placements: {
          ...bundle.config.placements,
          "9:16": { ...RECOMMENDED_MASCOT_PLACEMENT_PRESET_9_16, anchor: "bottom_right" as const },
        },
      },
      assets: {
        ...bundle.assets,
        actions: {
          ...bundle.assets.actions,
          celebrate: {
            version: 2 as const,
            action: "celebrate" as const,
            image_url: "./celebrate.png",
            registration,
            motion: { preset: "none" as const, speed: 1, intensity: "normal" as const },
          },
        },
      },
    };
    return renderState(
      placed,
      "9:16",
      { phase: "reveal", atSeconds: 0, durationSeconds: 1, playing: true, revealOutcome: "correct" },
      (url) => url,
      false,
    );
  }

  it("puts the ledge on the feet of a landscape mascot whose art reaches the image bottom", () => {
    // The user's mascot: a 1280x720 image whose opaque art touches the bottom row, pivot at the bottom center.
    const html = celebrateStateHtml({
      source_width: 1280,
      source_height: 720,
      content_bounds: { x: 0, y: 0, width: 1280, height: 720 },
      pivot: { x: 640, y: 720 },
      offset_x: 0,
      offset_y: 0,
    });
    expect(html).toContain("--mascot-content-bottom-gap:0px");
    expect(html).toContain("--mascot-content-center-x:0px");
    expect(html).toMatch(/--mascot-content-width:633\.6px/);
  });

  it("lifts the ledge by the transparent padding under the art", () => {
    // 220x220 canvas, art in the top 150 rows, pivot at the canvas bottom: 70 transparent rows x scale 2.88.
    const html = celebrateStateHtml({
      source_width: 220,
      source_height: 220,
      content_bounds: { x: 0, y: 0, width: 220, height: 150 },
      pivot: { x: 110, y: 220 },
      offset_x: 0,
      offset_y: 0,
    });
    expect(html).toContain("--mascot-content-bottom-gap:201.6px");
  });
});
