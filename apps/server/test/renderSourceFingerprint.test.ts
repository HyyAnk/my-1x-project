import { describe, expect, it } from "vitest";
import { renderSourceFingerprint } from "../src/tasks/fingerprints.js";

const BASE_ARGS = {
  html: '<main data-composition-id="quiz-v2-candy-arcade"></main>',
  narrationModifiedAt: "2026-09-05T00:00:00Z",
  narrationSize: 2048,
  assets: [{ asset_id: "asset-1", fingerprint: "fp-1", path: "assets/asset-1.png" }],
  dependencies: ["font:baloo"],
} as const;

function fingerprint(compositionFiles: Record<string, string> = {}): string {
  return renderSourceFingerprint(
    BASE_ARGS.html,
    BASE_ARGS.narrationModifiedAt,
    BASE_ARGS.narrationSize,
    [...BASE_ARGS.assets],
    [...BASE_ARGS.dependencies],
    compositionFiles,
  );
}

describe("renderSourceFingerprint", () => {
  it("is stable for identical inputs", () => {
    const files = { "compositions/scene-1.html": '<section class="clip"></section>' };
    expect(fingerprint(files)).toBe(fingerprint(files));
  });

  it("changes when only a sub-composition file changes", () => {
    const before = fingerprint({ "compositions/scene-1.html": "<section>Question A</section>" });
    const after = fingerprint({ "compositions/scene-1.html": "<section>Question B</section>" });
    expect(after).not.toBe(before);
  });

  it("changes when a sub-composition file is added or removed", () => {
    const withFile = fingerprint({ "compositions/scene-1.html": "<section>Question A</section>" });
    const withExtraFile = fingerprint({
      "compositions/scene-1.html": "<section>Question A</section>",
      "compositions/scene-2.html": "<section>Question B</section>",
    });
    expect(withExtraFile).not.toBe(withFile);
    expect(fingerprint()).not.toBe(withFile);
  });

  it("is independent of composition file key order", () => {
    const first = fingerprint({
      "compositions/scene-1.html": "<section>A</section>",
      "compositions/scene-2.html": "<section>B</section>",
    });
    const second = fingerprint({
      "compositions/scene-2.html": "<section>B</section>",
      "compositions/scene-1.html": "<section>A</section>",
    });
    expect(second).toBe(first);
  });
});
