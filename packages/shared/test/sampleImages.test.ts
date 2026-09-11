import test from "node:test";
import assert from "node:assert/strict";
import {
  SAMPLE_IMAGE_SPECS,
  getSampleImageSpec,
  generateSampleImageSvg,
  generateSampleImageDataUri,
  type SampleImageAspectRatio,
} from "../src/sampleImages.js";

test("SAMPLE_IMAGE_SPECS defines all 4 standardized aspect ratios plus 3:4 portrait", () => {
  const expectedRatios: SampleImageAspectRatio[] = ["16:9", "4:3", "1:1", "9:16", "3:4"];
  for (const ratio of expectedRatios) {
    const spec = SAMPLE_IMAGE_SPECS[ratio];
    assert.ok(spec, `Spec for ${ratio} should exist`);
    assert.equal(spec.aspectRatio, ratio);
    assert.ok(spec.width > 0);
    assert.ok(spec.height > 0);
    assert.ok(spec.recommendedResolution.length > 0);
    assert.ok(spec.role.length > 0);
  }
});

test("getSampleImageSpec returns corresponding spec or defaults to 16:9", () => {
  assert.equal(getSampleImageSpec("16:9").aspectRatio, "16:9");
  assert.equal(getSampleImageSpec("4:3").aspectRatio, "4:3");
  assert.equal(getSampleImageSpec("1:1").aspectRatio, "1:1");
  assert.equal(getSampleImageSpec("9:16").aspectRatio, "9:16");
  assert.equal(getSampleImageSpec("unknown").aspectRatio, "16:9");
});

test("generateSampleImageSvg produces valid SVG with dimensions and labels", () => {
  const spec = SAMPLE_IMAGE_SPECS["4:3"];
  const svg = generateSampleImageSvg(spec, {
    slotLabel: "QUESTION HERO",
    subLabel: "1080x810 - Clue Deduction",
  });

  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.endsWith("</svg>"));
  assert.ok(svg.includes('viewBox="0 0 1080 810"'));
  assert.ok(svg.includes("QUESTION HERO"));
  assert.ok(svg.includes("1080x810 - Clue Deduction"));
  assert.ok(svg.includes("SAFE AREA (85%)"));
});

test("generateSampleImageDataUri produces valid browser-loadable data URI", () => {
  const spec = SAMPLE_IMAGE_SPECS["1:1"];
  const dataUri = generateSampleImageDataUri(spec, {
    slotLabel: "CHOICE A",
  });

  assert.ok(dataUri.startsWith("data:image/svg+xml;charset=utf-8,"));
  assert.ok(dataUri.includes("CHOICE%20A"));
});
